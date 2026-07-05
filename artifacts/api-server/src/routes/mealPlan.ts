import { Router } from 'express';
import { db, mealPlansTable, recipesTable, recipeIngredientsTable, shoppingItemsTable } from '@workspace/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import crypto from 'crypto';
import { z } from 'zod';

// Whitelist for PATCH /:id — only these fields are client-editable. Without
// this, {...req.body} spread into .set() unchecked could overwrite id/userId/
// householdId on the caller's own row.
const mealPlanPatchSchema = z.object({
  date:       z.string().optional(),
  mealSlot:   z.string().optional(),
  mealType:   z.string().optional(),
  recipeId:   z.string().optional(),
  leftoverId: z.string().optional(),
  customName: z.string().optional(),
  servings:   z.number().optional(),
  isCooked:   z.boolean().optional(),
  notes:      z.string().optional(),
});

const router: Router = Router();

router.get('/', requireAuth, async (req, res): Promise<void> => {
  const { start, end } = req.query as { start?: string; end?: string };
  let query = db.select().from(mealPlansTable).where(eq(mealPlansTable.userId, req.userId));
  const plans = await query;
  res.json(serialize(plans));
  return;
});

router.post('/', requireAuth, async (req, res): Promise<void> => {
  const [plan] = await db.insert(mealPlansTable).values({
    id: crypto.randomUUID(),
    userId: req.userId,
    ...req.body,
  }).returning();
  res.json(serialize(plan));
  return;
});

router.patch('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;

  const parsed = mealPlanPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors });
    return;
  }

  const [updated] = await db
    .update(mealPlansTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(mealPlansTable.id, id), eq(mealPlansTable.userId, req.userId)))
    .returning();
  res.json(serialize(updated));
  return;
});

router.delete('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  await db.delete(mealPlansTable).where(
    and(eq(mealPlansTable.id, id), eq(mealPlansTable.userId, req.userId))
  );
  res.json({ ok: true });
  return;
});

router.post('/generate-shopping', requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.body as { startDate: string; endDate: string };
  const plans = await db.select().from(mealPlansTable).where(
    and(eq(mealPlansTable.userId, req.userId), gte(mealPlansTable.date, startDate), lte(mealPlansTable.date, endDate))
  );

  const added: string[] = [];
  for (const plan of plans) {
    if (plan.recipeId) {
      const ingredients = await db.select().from(recipeIngredientsTable).where(eq(recipeIngredientsTable.recipeId, plan.recipeId));
      for (const ing of ingredients) {
        await db.insert(shoppingItemsTable).values({
          id: crypto.randomUUID(),
          userId: req.userId,
          name: ing.name,
          quantity: ing.quantity?.toString() ?? '1',
          unit: ing.unit ?? 'count',
          addedFrom: 'meal-plan',
        }).onConflictDoNothing();
        added.push(ing.name);
      }
    }
  }

  res.json({ ok: true, added });
  return;
});

export default router;
