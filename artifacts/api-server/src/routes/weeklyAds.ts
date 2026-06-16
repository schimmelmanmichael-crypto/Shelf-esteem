import { Router } from 'express';
import { db, weeklyAdsTable, weeklyAdItemsTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import crypto from 'crypto';

const router: Router = Router();

router.get('/', requireAuth, async (req, res): Promise<void> => {
  const ads = await db.select().from(weeklyAdsTable).where(eq(weeklyAdsTable.userId, req.userId));
  res.json(serialize(ads));
  return;
});

router.get('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [ad] = await db.select().from(weeklyAdsTable)
    .where(and(eq(weeklyAdsTable.id, id), eq(weeklyAdsTable.userId, req.userId)))
    .limit(1);
  if (!ad) { res.status(404).json({ error: 'Not found' }); return; }

  const items = await db.select().from(weeklyAdItemsTable).where(eq(weeklyAdItemsTable.weeklyAdId, ad.id));
  res.json(serialize({ ...ad, items }));
  return;
});

router.post('/', requireAuth, async (req, res): Promise<void> => {
  const { items: _items, ...adData } = req.body as { items?: unknown[]; storeName: string; [k: string]: unknown };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ad] = await db.insert(weeklyAdsTable).values({
    id: crypto.randomUUID(),
    userId: req.userId,
    ...adData,
    status: 'pending',
  } as any).returning();
  res.json(serialize(ad));
  return;
});

router.delete('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  await db.delete(weeklyAdItemsTable).where(eq(weeklyAdItemsTable.weeklyAdId, id));
  await db.delete(weeklyAdsTable).where(
    and(eq(weeklyAdsTable.id, id), eq(weeklyAdsTable.userId, req.userId))
  );
  res.json({ ok: true });
  return;
});

export default router;
