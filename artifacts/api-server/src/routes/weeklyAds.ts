import { Router } from 'express';
import { db, weeklyAdsTable, weeklyAdItemsTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import crypto from 'crypto';
import { z } from 'zod';

// Whitelist for POST / — only these fields are client-settable. Without
// this, {...adData} spread into .values() unchecked (previously cast `as any`
// to bypass the type error that whitelisting now fixes properly) could
// overwrite id/userId/status on the new row.
const weeklyAdPostSchema = z.object({
  storeName: z.string().min(1),
  weekOf:    z.string().optional(),
  imageUrl:  z.string().optional(),
  sourceUrl: z.string().optional(),
  rawText:   z.string().optional(),
});

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
  const parsed = weeklyAdPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors });
    return;
  }

  const [ad] = await db.insert(weeklyAdsTable).values({
    id: crypto.randomUUID(),
    userId: req.userId,
    ...parsed.data,
    status: 'pending',
  }).returning();
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
