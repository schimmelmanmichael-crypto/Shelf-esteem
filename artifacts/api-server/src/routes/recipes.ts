import { Router } from 'express';
import { db, recipesTable, recipeIngredientsTable, pantryItemsTable } from '@workspace/db';
import { eq, and, or, isNull } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { applyPantryDeduction } from '../lib/pantry-deduction.js';
import { serialize } from '../lib/serialize.js';
import { getOrCreateHouseholdId } from '../lib/household.js';
import { IdempotencyConflictError, isUniqueConstraintViolation } from '../lib/idempotency.js';
import { logger } from '../lib/logger.js';
import crypto from 'crypto';
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

const router: Router = Router();

router.get('/', requireAuth, async (req, res): Promise<void> => {
  const recipes = await db
    .select()
    .from(recipesTable)
    .where(or(eq(recipesTable.userId, req.userId), isNull(recipesTable.userId)));
  res.json(serialize(recipes));
  return;
});

router.get('/can-cook', requireAuth, async (req, res): Promise<void> => {
  const pantryItems = await db.select().from(pantryItemsTable).where(eq(pantryItemsTable.userId, req.userId));
  const pantryNames = new Set(pantryItems.map(i => i.name.toLowerCase()));

  const userRecipes = await db
    .select()
    .from(recipesTable)
    .where(or(eq(recipesTable.userId, req.userId), isNull(recipesTable.userId)));

  const canCook = [];
  for (const recipe of userRecipes) {
    const ingredients = await db.select().from(recipeIngredientsTable).where(eq(recipeIngredientsTable.recipeId, recipe.id));
    const missing = ingredients.filter(ing => !pantryNames.has(ing.name.toLowerCase()));
    if (missing.length === 0 && ingredients.length > 0) {
      canCook.push({ ...recipe, ingredients });
    }
  }

  res.json(serialize(canCook));
  return;
});

router.get('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [recipe] = await db.select().from(recipesTable).where(eq(recipesTable.id, id)).limit(1);
  if (!recipe) { res.status(404).json({ error: 'Not found' }); return; }

  const ingredients = await db.select().from(recipeIngredientsTable).where(eq(recipeIngredientsTable.recipeId, recipe.id));
  const pantryItems = await db.select().from(pantryItemsTable).where(eq(pantryItemsTable.userId, req.userId));
  const pantryNames = new Set(pantryItems.map(i => i.name.toLowerCase()));

  const enrichedIngredients = ingredients.map(ing => ({
    ...ing,
    inPantry: pantryNames.has(ing.name.toLowerCase()),
  }));

  res.json(serialize({ ...recipe, ingredients: enrichedIngredients }));
  return;
});

router.post('/', requireAuth, async (req, res): Promise<void> => {
  const { ingredients, ...recipeData } = req.body as { ingredients?: Array<{ name: string; quantity: number; unit: string }>; [key: string]: unknown };
  const recipeId = crypto.randomUUID();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recipe] = await db.insert(recipesTable).values({
    id: recipeId,
    userId: req.userId,
    ...recipeData,
  } as any).returning();

  if (ingredients?.length) {
    await db.insert(recipeIngredientsTable).values(
      ingredients.map((ing, i) => ({
        id: crypto.randomUUID(),
        recipeId,
        name: ing.name,
        quantity: ing.quantity.toString(),
        unit: ing.unit,
        sortOrder: i,
      }))
    );
  }

  res.json(serialize(recipe));
  return;
});

router.patch('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const { ingredients, ...recipeData } = req.body as { ingredients?: Array<{ name: string; quantity: number; unit: string }>; [key: string]: unknown };

  const [recipe] = await db
    .update(recipesTable)
    .set({ ...recipeData, updatedAt: new Date() })
    .where(and(eq(recipesTable.id, id), eq(recipesTable.userId, req.userId)))
    .returning();

  if (ingredients) {
    await db.delete(recipeIngredientsTable).where(eq(recipeIngredientsTable.recipeId, id));
    await db.insert(recipeIngredientsTable).values(
      ingredients.map((ing, i) => ({
        id: crypto.randomUUID(),
        recipeId: id,
        name: ing.name,
        quantity: ing.quantity.toString(),
        unit: ing.unit,
        sortOrder: i,
      }))
    );
  }

  res.json(serialize(recipe));
  return;
});

router.delete('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  await db.delete(recipeIngredientsTable).where(eq(recipeIngredientsTable.recipeId, id));
  await db.delete(recipesTable).where(
    and(eq(recipesTable.id, id), eq(recipesTable.userId, req.userId))
  );
  res.json({ ok: true });
  return;
});

router.post('/:id/cook', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  // cookSessionId: optional client-supplied key for forward-compat. A client
  // update can send a stable id it reuses across a retry/double-submit of
  // the SAME cook action; until then, one minted fresh per request can only
  // ever match itself, so idempotency detection has no real effect yet.
  // leftoverServings: optional client-supplied "how many servings to save as
  // a leftover" — omitted or 0 means no leftover, same as today's behavior.
  const { servings, cookSessionId: clientCookSessionId, leftoverServings } = req.body as {
    servings?: number;
    cookSessionId?: string;
    leftoverServings?: number;
  };
  // Ownership-or-community check, same rule GET / and GET /can-cook already
  // use — without this, any authenticated user could cook ANY recipe by id,
  // including another user's private (non-community) recipe, deducting
  // their own pantry using ingredients from a recipe that wasn't theirs to use.
  const [recipe] = await db.select().from(recipesTable)
    .where(and(eq(recipesTable.id, id), or(eq(recipesTable.userId, req.userId), isNull(recipesTable.userId))))
    .limit(1);
  if (!recipe) { res.status(404).json({ error: 'Not found' }); return; }

  const ingredients = await db.select().from(recipeIngredientsTable).where(eq(recipeIngredientsTable.recipeId, id));
  const householdId = await getOrCreateHouseholdId(req.userId);
  const cookSessionId = clientCookSessionId ?? crypto.randomUUID();

  let result;
  try {
    result = await applyPantryDeduction(
      req.userId,
      householdId,
      ingredients.map(i => ({ name: i.name, quantity: Number(i.quantity ?? 1), unit: i.unit ?? 'count' })),
      servings ?? recipe.servings ?? 1,
      recipe.id,
      cookSessionId,
      leftoverServings ?? 0,
      recipe.name
    );
  } catch (err) {
    if (err instanceof IdempotencyConflictError) {
      res.status(409).json({ error: 'Idempotency conflict', message: err.message });
      return;
    }
    if (isUniqueConstraintViolation(err)) {
      // Genuine concurrent double-submit racing on the same cook session —
      // rare (the app-level check above catches the common sequential-retry
      // case first), but real. Ask the client to reconcile rather than
      // fabricate a success response we can't back with committed data.
      res.status(409).json({ error: 'Concurrent duplicate request', message: 'This cook session is already being processed' });
      return;
    }
    logger.error({ err }, 'Cook deduction error');
    res.status(500).json({ error: 'Failed to cook recipe' });
    return;
  }

  await db.update(recipesTable).set({ timesCooked: (recipe.timesCooked ?? 0) + 1 }).where(eq(recipesTable.id, recipe.id));

  res.json({ ok: true, ...result });
  return;
});

router.post('/scrape-url', requireAuth, async (req, res): Promise<void> => {
  const { url } = req.body as { url: string };
  try {
    const openai = getOpenAI();
    const pageRes = await fetch(url);
    const html = await pageRes.text();
    const truncated = html.slice(0, 8000);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `Extract the recipe from this HTML. Return JSON: { name, description, servings, prepTime, cookTime, instructions, ingredients: [{name, quantity, unit}] }\n\n${truncated}`,
      }],
      temperature: 0.2,
      max_tokens: 1500,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch {
    res.status(500).json({ error: 'Scrape failed' });
  }
  return;
});

export default router;
