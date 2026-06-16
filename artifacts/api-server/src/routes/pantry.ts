import { Router } from 'express';
import { db, pantryItemsTable } from '@workspace/db';
import { eq, and, like, or } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { lookupBarcode } from '../lib/barcodeService.js';
import { serialize } from '../lib/serialize.js';
import crypto from 'crypto';

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
  const item = await db.insert(pantryItemsTable).values({
    id: crypto.randomUUID(),
    userId: req.userId,
    ...req.body,
  }).returning();
  res.json(serialize(item[0]));
  return;
});

router.patch('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [updated] = await db
    .update(pantryItemsTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(pantryItemsTable.id, id), eq(pantryItemsTable.userId, req.userId)))
    .returning();
  res.json(serialize(updated));
  return;
});

router.delete('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  await db.delete(pantryItemsTable).where(
    and(eq(pantryItemsTable.id, id), eq(pantryItemsTable.userId, req.userId))
  );
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
