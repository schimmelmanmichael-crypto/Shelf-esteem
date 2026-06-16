import { Router } from 'express';
import { db, receiptsTable, receiptItemsTable, pantryItemsTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import crypto from 'crypto';

const router: Router = Router();

router.get('/', requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(receiptsTable).where(eq(receiptsTable.userId, req.userId));
  res.json(serialize(items));
  return;
});

router.get('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [receipt] = await db.select().from(receiptsTable)
    .where(and(eq(receiptsTable.id, id), eq(receiptsTable.userId, req.userId)))
    .limit(1);
  if (!receipt) { res.status(404).json({ error: 'Not found' }); return; }

  const items = await db.select().from(receiptItemsTable).where(eq(receiptItemsTable.receiptId, receipt.id));
  res.json(serialize({ ...receipt, items }));
  return;
});

router.post('/', requireAuth, async (req, res): Promise<void> => {
  const { items: _items, ...receiptData } = req.body as { items?: unknown[]; [k: string]: unknown };
  const receiptId = crypto.randomUUID();
  const [receipt] = await db.insert(receiptsTable).values({
    id: receiptId,
    userId: req.userId,
    ...receiptData,
    status: 'pending',
  }).returning();
  res.json(serialize(receipt));
  return;
});

router.patch('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [updated] = await db
    .update(receiptsTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(receiptsTable.id, id), eq(receiptsTable.userId, req.userId)))
    .returning();
  res.json(serialize(updated));
  return;
});

router.delete('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  await db.delete(receiptItemsTable).where(eq(receiptItemsTable.receiptId, id));
  await db.delete(receiptsTable).where(
    and(eq(receiptsTable.id, id), eq(receiptsTable.userId, req.userId))
  );
  res.json({ ok: true });
  return;
});

router.post('/:id/confirm', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const { addToPantry = false } = req.body as { addToPantry?: boolean };
  const items = await db.select().from(receiptItemsTable).where(eq(receiptItemsTable.receiptId, id));

  if (addToPantry) {
    for (const item of items) {
      await db.insert(pantryItemsTable).values({
        id: crypto.randomUUID(),
        userId: req.userId,
        name: item.name,
        quantity: item.quantity?.toString() ?? '1',
        unit: item.unit ?? 'count',
        category: item.category,
      }).onConflictDoNothing();

      await db.update(receiptItemsTable)
        .set({ addedToPantry: 'yes' })
        .where(eq(receiptItemsTable.id, item.id));
    }
  }

  await db.update(receiptsTable)
    .set({ status: 'confirmed', updatedAt: new Date() })
    .where(eq(receiptsTable.id, id));

  res.json({ ok: true });
  return;
});

export default router;
