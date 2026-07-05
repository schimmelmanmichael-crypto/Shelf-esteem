import { Router } from 'express';
import { db, leftoversTable, missedOpportunitiesTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import crypto from 'crypto';
import { z } from 'zod';

// Whitelist for PATCH /:id — only these fields are client-editable. Without
// this, {...req.body} spread into .set() unchecked could overwrite id/userId/
// householdId on the caller's own row.
const leftoverPatchSchema = z.object({
  mealName:         z.string().min(1).optional(),
  recipeId:         z.string().optional(),
  parentLeftoverId: z.string().optional(),
  servingsAvailable: z.number().optional(),
  servingsOriginal:  z.number().optional(),
  costPerServing:    z.number().optional().transform(v => v?.toString()),
  storageLocation:   z.string().optional(),
  expirationDate:    z.string().optional(),
  status:            z.string().optional(),
  notes:             z.string().optional(),
});

const router: Router = Router();

router.get('/', requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(leftoversTable).where(eq(leftoversTable.userId, req.userId));
  res.json(serialize(items));
  return;
});

router.post('/', requireAuth, async (req, res): Promise<void> => {
  const [item] = await db.insert(leftoversTable).values({
    id: crypto.randomUUID(),
    userId: req.userId,
    ...req.body,
  }).returning();
  res.json(serialize(item));
  return;
});

router.patch('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;

  const parsed = leftoverPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors });
    return;
  }

  const [updated] = await db
    .update(leftoversTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(leftoversTable.id, id), eq(leftoversTable.userId, req.userId)))
    .returning();
  res.json(serialize(updated));
  return;
});

router.delete('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  await db.delete(leftoversTable).where(
    and(eq(leftoversTable.id, id), eq(leftoversTable.userId, req.userId))
  );
  res.json({ ok: true });
  return;
});

router.post('/:id/consume', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const { servings = 1 } = req.body as { servings?: number };
  const [leftover] = await db.select().from(leftoversTable)
    .where(and(eq(leftoversTable.id, id), eq(leftoversTable.userId, req.userId)))
    .limit(1);

  if (!leftover) { res.status(404).json({ error: 'Not found' }); return; }

  const remaining = Math.max(0, (leftover.servingsAvailable ?? 0) - servings);
  const status = remaining === 0 ? 'consumed' : 'active';

  const [updated] = await db
    .update(leftoversTable)
    .set({ servingsAvailable: remaining, status, updatedAt: new Date() })
    .where(eq(leftoversTable.id, leftover.id))
    .returning();

  res.json(serialize(updated));
  return;
});

router.post('/:id/missed-opportunity', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [leftover] = await db.select().from(leftoversTable)
    .where(and(eq(leftoversTable.id, id), eq(leftoversTable.userId, req.userId)))
    .limit(1);

  if (!leftover) { res.status(404).json({ error: 'Not found' }); return; }

  const servingsLost = leftover.servingsAvailable ?? 0;
  const dollarValueLost = leftover.costPerServing
    ? (Number(leftover.costPerServing) * servingsLost).toString()
    : '0';

  await db.insert(missedOpportunitiesTable).values({
    id: crypto.randomUUID(),
    userId: req.userId,
    leftoverId: leftover.id,
    mealName: leftover.mealName,
    servingsLost,
    dollarValueLost,
    dateLost: new Date().toISOString().split('T')[0],
    reason: 'manual',
  });

  await db.update(leftoversTable)
    .set({ status: 'wasted', servingsAvailable: 0, updatedAt: new Date() })
    .where(eq(leftoversTable.id, leftover.id));

  res.json({ ok: true });
  return;
});

router.get('/analytics', requireAuth, async (req, res): Promise<void> => {
  const missed = await db.select().from(missedOpportunitiesTable)
    .where(eq(missedOpportunitiesTable.userId, req.userId));

  const totalServingsLost = missed.reduce((s, m) => s + (m.servingsLost ?? 0), 0);
  const totalDollarLost = missed.reduce((s, m) => s + Number(m.dollarValueLost ?? 0), 0);
  const autoDetected = missed.filter(m => m.reason === 'expired').length;
  const manuallyLogged = missed.filter(m => m.reason === 'manual').length;

  res.json({
    totalServingsLost,
    totalDollarLost: totalDollarLost.toFixed(2),
    autoDetected,
    manuallyLogged,
    history: serialize(missed),
  });
  return;
});

export default router;
