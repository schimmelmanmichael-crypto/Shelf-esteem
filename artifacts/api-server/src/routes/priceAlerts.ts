import { Router } from 'express';
import { db, priceAlertsTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import crypto from 'crypto';

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
  const [updated] = await db
    .update(priceAlertsTable)
    .set({ ...req.body, updatedAt: new Date() })
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
