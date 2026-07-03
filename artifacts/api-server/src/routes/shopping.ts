import { Router } from 'express';
import { db, shoppingItemsTable, pantryItemsTable, receiptsTable, receiptItemsTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import { logger } from '../lib/logger.js';
import { getOrCreateHouseholdId } from '../lib/household.js';
import { recordPantryEvent } from '../lib/pantryEvents.js';
import crypto from 'crypto';
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

const router: Router = Router();

router.get('/', requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(shoppingItemsTable).where(eq(shoppingItemsTable.userId, req.userId));
  res.json(serialize(items));
  return;
});

router.post('/', requireAuth, async (req, res): Promise<void> => {
  const [item] = await db.insert(shoppingItemsTable).values({
    id: crypto.randomUUID(),
    userId: req.userId,
    ...req.body,
  }).returning();
  res.json(serialize(item));
  return;
});

router.patch('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [updated] = await db
    .update(shoppingItemsTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(shoppingItemsTable.id, id), eq(shoppingItemsTable.userId, req.userId)))
    .returning();
  res.json(serialize(updated));
  return;
});

router.delete('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  await db.delete(shoppingItemsTable).where(
    and(eq(shoppingItemsTable.id, id), eq(shoppingItemsTable.userId, req.userId))
  );
  res.json({ ok: true });
  return;
});

router.post('/purchase', requireAuth, async (req, res): Promise<void> => {
  const { storeName, purchaseDate, items } = req.body as {
    storeName: string;
    purchaseDate: string;
    items: Array<{ id: string; name: string; quantity: string; unit: string; price?: string }>;
  };

  const householdId = await getOrCreateHouseholdId(req.userId);
  const receiptId = crypto.randomUUID();
  const total = items.reduce((sum, i) => sum + Number(i.price ?? 0), 0);

  await db.insert(receiptsTable).values({
    id: receiptId,
    userId: req.userId,
    householdId,
    storeName,
    purchaseDate,
    total: total.toString(),
    status: 'confirmed',
    itemCount: items.length,
  });

  for (const item of items) {
    const itemId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(pantryItemsTable).values({
        id: itemId,
        userId: req.userId,
        householdId,
        name: item.name,
        quantity: item.quantity ?? '1',
        unit: item.unit ?? 'count',
        purchaseStore: storeName,
      }).onConflictDoNothing();

      // RC2 canon §3.2 — a shopping-list purchase adds food to pantry via an Acquire event.
      await recordPantryEvent({
        tx,
        householdId,
        pantryItemId: itemId,
        eventType: 'acquire',
        quantityDelta: parseFloat(item.quantity ?? '1'),
        unit: item.unit ?? 'count',
        source: 'shopping_purchase',
        // Placeholder key — receiptId is freshly minted per request, not a stable
        // client-supplied id, so this can't detect a duplicate submit yet either
        // (same limitation as the manual pantry-add path — ticket 4 territory).
        idempotencyKey: crypto.randomUUID(),
        createdByUserAccountId: req.userId,
        metadata: { source_type: 'shopping_purchase', receipt_id: receiptId },
      });
    });

    await db.delete(shoppingItemsTable).where(
      and(eq(shoppingItemsTable.id, item.id), eq(shoppingItemsTable.userId, req.userId))
    );
  }

  res.json({ ok: true, receiptId });
  return;
});

router.post('/coupons', requireAuth, async (req, res): Promise<void> => {
  const { items } = req.body as { items: string[] };

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'items array is required' });
    return;
  }

  const prompt = `You are a grocery savings expert. Given this shopping list, suggest specific coupons, deals, and savings strategies available at major US grocery stores (Publix, Walmart, Kroger, Target, Aldi, Costco).

Shopping list:
${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Respond ONLY with valid JSON in exactly this format — no markdown, no preamble, no explanation:
{
  "coupons": [
    {
      "item": "item name from the list",
      "store": "store name",
      "deal": "specific deal or coupon description",
      "savings": "estimated savings amount (e.g. $0.50 off, Buy 1 Get 1)",
      "tip": "optional additional savings tip"
    }
  ],
  "generalTips": ["tip 1", "tip 2"],
  "estimatedTotalSavings": "estimated total savings range (e.g. $3–$8)"
}`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      res.json({
        coupons: [],
        generalTips: ["Check your store's weekly app for digital coupons."],
        estimatedTotalSavings: 'Unknown',
        parseError: true,
      });
      return;
    }

    res.json(parsed);
  } catch (err) {
    logger.error({ err }, 'Coupon finder error');
    res.status(500).json({ error: 'Coupon lookup failed' });
  }
  return;
});

export default router;
