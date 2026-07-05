import { Router } from 'express';
import { db, pantryItemsTable } from '@workspace/db';
import { eq, and, like, or } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { lookupBarcode } from '../lib/barcodeService.js';
import { serialize } from '../lib/serialize.js';
import { getOrCreateHouseholdId } from '../lib/household.js';
import { recordPantryEvent } from '../lib/pantryEvents.js';
import { resolveIdempotency, IdempotencyConflictError, isUniqueConstraintViolation } from '../lib/idempotency.js';
import { logger } from '../lib/logger.js';
import { PANTRY_EVENT_REASON_CODES } from '@workspace/db';
import type { PantryEventReasonCode } from '@workspace/db';
import crypto from 'crypto';
import { z } from 'zod';

// Zod schema for POST /pantry — only these fields are allowed into the DB
const pantryPostSchema = z.object({
  name:          z.string().min(1),                // required
  quantity:      z.number().optional().transform(v => v?.toString()),
  unit:          z.string().optional(),
  brand:         z.string().optional(),
  category:      z.string().optional(),
  storageArea:   z.string().optional(),
  expiryDate:    z.string().optional(),
  notes:         z.string().optional(),
  purchasePrice: z.number().optional().transform(v => v?.toString()),
  purchaseStore: z.string().optional(),
});

// Zod schema for PATCH /pantry/:id — same whitelist as POST, every field optional
const pantryPatchSchema = pantryPostSchema.partial();

const router: Router = Router();

router.get('/', requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(pantryItemsTable).where(eq(pantryItemsTable.userId, req.userId));
  res.json(serialize(items));
  return;
});

router.get('/summary', requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(pantryItemsTable).where(eq(pantryItemsTable.userId, req.userId));
  const today = new Date();
  const in7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const expiringSoon = items.filter(i => i.expiryDate && i.expiryDate <= in7 && i.expiryDate >= today.toISOString().split('T')[0]);
  const expired = items.filter(i => i.expiryDate && i.expiryDate < today.toISOString().split('T')[0]);

  const shelfScore = Math.max(0, 100 - expired.length * 10 - expiringSoon.length * 3);

  res.json({ itemCount: items.length, expiringSoon, expired, shelfScore });
  return;
});

router.post('/', requireAuth, async (req, res): Promise<void> => {
  // Validate req.body — reject unknown fields automatically (Zod strips them)
  const parsed = pantryPostSchema.safeParse(req.body);
  if (!parsed.success) {
    // Return which fields failed and why, so the client can surface them
    res.status(400).json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const householdId = await getOrCreateHouseholdId(req.userId);
    const itemId = crypto.randomUUID();

    const item = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(pantryItemsTable).values({
        id: itemId,
        userId: req.userId,
        householdId,
        ...parsed.data, // only whitelisted, validated fields
      }).returning();

      // RC2 canon §3.2 — manual pantry add is an Acquire event.
      await recordPantryEvent({
        tx,
        householdId,
        pantryItemId: itemId,
        eventType: 'acquire',
        quantityDelta: parseFloat(parsed.data.quantity ?? '0'),
        unit: parsed.data.unit ?? 'count',
        source: 'manual',
        // Placeholder key — ticket 4 wires up real client-supplied idempotency keys + conflict validation.
        idempotencyKey: crypto.randomUUID(),
        createdByUserAccountId: req.userId,
        metadata: { source_type: 'manual' },
      });

      return inserted;
    });

    res.json(serialize(item));
  } catch {
    // Never leak DB internals to the client
    res.status(500).json({ error: 'Failed to save pantry item' });
  }
  return;
});

router.patch('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;

  const parsed = pantryPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors });
    return;
  }

  const [before] = await db
    .select()
    .from(pantryItemsTable)
    .where(and(eq(pantryItemsTable.id, id), eq(pantryItemsTable.userId, req.userId)))
    .limit(1);

  if (!before) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const householdId = before.householdId ?? await getOrCreateHouseholdId(req.userId);

  // RC2 canon §11.1 reason_code, chosen by field priority since a PATCH may
  // touch several fields at once: quantity > storage location > freshness > generic.
  let reasonCode: PantryEventReasonCode = 'user_correction';
  if (parsed.data.quantity !== undefined) reasonCode = 'quantity_adjustment';
  else if (parsed.data.storageArea !== undefined) reasonCode = 'location_change';
  else if (parsed.data.expiryDate !== undefined) reasonCode = 'freshness_override';

  const oldQty = parseFloat(before.quantity?.toString() ?? '0');
  const newQty = parsed.data.quantity !== undefined ? parseFloat(parsed.data.quantity) : oldQty;

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(pantryItemsTable)
      .set({ ...parsed.data, householdId, updatedAt: new Date() })
      .where(and(eq(pantryItemsTable.id, id), eq(pantryItemsTable.userId, req.userId)))
      .returning();

    // RC2 canon §3.2/§11.8 — a manual PATCH is a Reconcile event.
    await recordPantryEvent({
      tx,
      householdId,
      pantryItemId: id,
      eventType: 'reconcile',
      quantityDelta: newQty - oldQty,
      unit: parsed.data.unit ?? before.unit ?? 'count',
      source: 'manual_correction',
      idempotencyKey: crypto.randomUUID(),
      createdByUserAccountId: req.userId,
      reasonCode,
      metadata: {
        source_type: 'manual_correction',
        actor_type: 'user',
        reason_code: reasonCode,
        actor: req.userId,
        prior_state_snapshot: before,
        corrected_state_snapshot: parsed.data,
        notes: null,
      },
    });

    return row;
  });

  res.json(serialize(updated));
  return;
});

router.delete('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;

  // Optional forward-compat override — client doesn't send this today, defaults to 'unknown'.
  const reasonParse = z.enum([...PANTRY_EVENT_REASON_CODES]).optional().safeParse(req.query['reason']);
  const reasonCode: PantryEventReasonCode = reasonParse.success && reasonParse.data ? reasonParse.data : 'unknown';

  const [before] = await db
    .select()
    .from(pantryItemsTable)
    .where(and(eq(pantryItemsTable.id, id), eq(pantryItemsTable.userId, req.userId)))
    .limit(1);

  if (!before) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const householdId = before.householdId ?? await getOrCreateHouseholdId(req.userId);
  const remainingQty = parseFloat(before.quantity?.toString() ?? '0');
  // Deterministic per pantry item — a sequential retry naturally 404s above
  // once the row is gone, so this mainly guards a concurrent duplicate DELETE
  // for the same item from creating two separate Discard events.
  const idempotencyKey = `${id}:discard`;
  const comparisonPayload = { pantryItemId: id, remainingQty, unit: before.unit ?? 'count', reasonCode };

  try {
    await db.transaction(async (tx) => {
      const { duplicate } = await resolveIdempotency({
        tx,
        householdId,
        eventType: 'discard',
        idempotencyKey,
        comparisonPayload,
      });

      if (duplicate) {
        return;
      }

      await tx.delete(pantryItemsTable).where(
        and(eq(pantryItemsTable.id, id), eq(pantryItemsTable.userId, req.userId))
      );

      // RC2 canon §3.2 — manual delete is a Discard event.
      await recordPantryEvent({
        tx,
        householdId,
        pantryItemId: id,
        eventType: 'discard',
        quantityDelta: -remainingQty,
        unit: before.unit ?? 'count',
        source: 'manual',
        idempotencyKey,
        createdByUserAccountId: req.userId,
        reasonCode,
        metadata: { source_type: 'manual', reason_code: reasonCode, idempotency_payload: comparisonPayload },
      });
    });
  } catch (err) {
    if (err instanceof IdempotencyConflictError) {
      res.status(409).json({ error: 'Idempotency conflict', message: err.message });
      return;
    }
    if (isUniqueConstraintViolation(err)) {
      res.status(409).json({ error: 'Concurrent duplicate request', message: 'This item is already being deleted' });
      return;
    }
    logger.error({ err }, 'Pantry delete error');
    res.status(500).json({ error: 'Failed to delete pantry item' });
    return;
  }

  res.json({ ok: true });
  return;
});

router.get('/barcode/:barcode', requireAuth, async (req, res): Promise<void> => {
  const barcode = req.params['barcode'] as string;
  const [item] = await db
    .select()
    .from(pantryItemsTable)
    .where(and(eq(pantryItemsTable.userId, req.userId), eq(pantryItemsTable.barcode, barcode)))
    .limit(1);
  res.json(item ?? null);
  return;
});

router.get('/external-barcode/:barcode', requireAuth, async (req, res): Promise<void> => {
  const barcode = req.params['barcode'] as string;
  const product = await lookupBarcode(barcode);
  res.json(product ?? null);
  return;
});

export default router;
