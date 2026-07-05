import { Router } from 'express';
import { db, receiptsTable, receiptItemsTable, pantryItemsTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import { getOrCreateHouseholdId } from '../lib/household.js';
import { recordPantryEvent } from '../lib/pantryEvents.js';
import { resolveIdempotency, IdempotencyConflictError, isUniqueConstraintViolation } from '../lib/idempotency.js';
import { logger } from '../lib/logger.js';
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

  // Ownership check — every other endpoint in this file already scopes by
  // userId (GET/PATCH/DELETE :id); this was the one exception, meaning any
  // authenticated user could confirm ANY receipt by id, copying its item
  // names/quantities into their own pantry and silently marking someone
  // else's receipt "confirmed" without consent.
  const [receipt] = await db.select().from(receiptsTable)
    .where(and(eq(receiptsTable.id, id), eq(receiptsTable.userId, req.userId)))
    .limit(1);
  if (!receipt) { res.status(404).json({ error: 'Not found' }); return; }

  const items = await db.select().from(receiptItemsTable).where(eq(receiptItemsTable.receiptId, id));
  const householdId = addToPantry ? await getOrCreateHouseholdId(req.userId) : null;

  try {
    // RC2 canon §3.7/§3.10 — checkout inventory commit is one atomic unit: all
    // Acquire events (and the bookkeeping flags for this confirm action) commit
    // together, or none do. Unlike receipt *parsing* (a separate, genuinely
    // async pipeline canon allows to fail independently), the addedToPantry
    // flags and the receipt's own confirmed status are part of this same
    // synchronous action, so they belong in the same transaction as the acquires.
    await db.transaction(async (tx) => {
      if (addToPantry && householdId) {
        for (const item of items) {
          const quantity = item.quantity?.toString() ?? '1';
          // Deterministic per (receipt, receipt item) — a genuine retry of the
          // same confirm reproduces the same key instead of double-acquiring.
          const idempotencyKey = `${id}:${item.id}`;
          const comparisonPayload = { receiptId: id, receiptItemId: item.id, name: item.name, quantity, unit: item.unit ?? 'count' };

          const { duplicate } = await resolveIdempotency({
            tx,
            householdId,
            eventType: 'acquire',
            idempotencyKey,
            comparisonPayload,
          });

          if (!duplicate) {
            const itemId = crypto.randomUUID();

            await tx.insert(pantryItemsTable).values({
              id: itemId,
              userId: req.userId,
              householdId,
              name: item.name,
              quantity,
              unit: item.unit ?? 'count',
              category: item.category,
            }).onConflictDoNothing();

            // RC2 canon §3.2 — receipt confirm adds food to pantry via an Acquire event.
            await recordPantryEvent({
              tx,
              householdId,
              pantryItemId: itemId,
              eventType: 'acquire',
              quantityDelta: parseFloat(quantity),
              unit: item.unit ?? 'count',
              source: 'receipt_confirm',
              idempotencyKey,
              createdByUserAccountId: req.userId,
              metadata: { source_type: 'receipt_confirm', receipt_item_id: item.id, idempotency_payload: comparisonPayload },
            });
          }

          await tx.update(receiptItemsTable)
            .set({ addedToPantry: 'yes' })
            .where(eq(receiptItemsTable.id, item.id));
        }
      }

      await tx.update(receiptsTable)
        .set({ status: 'confirmed', updatedAt: new Date() })
        .where(eq(receiptsTable.id, id));
    });
  } catch (err) {
    if (err instanceof IdempotencyConflictError) {
      res.status(409).json({ error: 'Idempotency conflict', message: err.message });
      return;
    }
    if (isUniqueConstraintViolation(err)) {
      res.status(409).json({ error: 'Concurrent duplicate request', message: 'This receipt is already being confirmed' });
      return;
    }
    logger.error({ err }, 'Receipt confirm error');
    res.status(500).json({ error: 'Failed to confirm receipt' });
    return;
  }

  res.json({ ok: true });
  return;
});

export default router;
