import { Router } from 'express';
import { db, priceAlertsTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import crypto from 'crypto';
import { z } from 'zod';

// Whitelist for PATCH /:id — only these fields are client-editable. Without
// this, {...req.body} spread into .set() unchecked could overwrite id/userId/
// householdId on the caller's own row.
const priceAlertPatchSchema = z.object({
  itemName:    z.string().optional(),
  barcode:     z.string().optional(),
  targetPrice: z.number().optional().transform(v => v?.toString()),
  storeName:   z.string().optional(),
  isActive:    z.boolean().optional(),
});

const router: Router = Router();

router.get('/', requireAuth, async (req, res): Promise<void> => {
  const alerts = await db.select().from(priceAlertsTable).where(eq(priceAlertsTable.userId, req.userId));
  res.json(serialize(alerts));
  return;
});

router.post('/', requireAuth, async (req, res): Promise<void> => {
  const [alert] = await db.insert(priceAlertsTable).values({
    id: crypto.randomUUID(),
    userId: req.userId,
    ...req.body,
  }).returning();
  res.json(serialize(alert));
  return;
});

router.patch('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;

  const parsed = priceAlertPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors });
    return;
  }

  const [updated] = await db
    .update(priceAlertsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(priceAlertsTable.id, id), eq(priceAlertsTable.userId, req.userId)))
    .returning();
  res.json(serialize(updated));
  return;
});

router.delete('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  await db.delete(priceAlertsTable).where(
    and(eq(priceAlertsTable.id, id), eq(priceAlertsTable.userId, req.userId))
  );
  res.json({ ok: true });
  return;
});

export default router;
