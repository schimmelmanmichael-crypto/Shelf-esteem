import { Router } from 'express';
import { db, receiptsTable, receiptItemsTable, priceHistoryTable } from '@workspace/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import crypto from 'crypto';

const router: Router = Router();

router.get('/summary', requireAuth, async (req, res): Promise<void> => {
  const receipts = await db.select().from(receiptsTable).where(eq(receiptsTable.userId, req.userId));
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const thisMonth = receipts.filter(r => r.purchaseDate && r.purchaseDate >= monthStart);
  const monthTotal = thisMonth.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const avgPerTrip = thisMonth.length > 0 ? monthTotal / thisMonth.length : 0;

  res.json({
    thisMonthTotal: monthTotal.toFixed(2),
    avgPerTrip: avgPerTrip.toFixed(2),
    tripCount: thisMonth.length,
    totalReceipts: receipts.length,
  });
  return;
});

router.get('/by-month', requireAuth, async (req, res): Promise<void> => {
  const receipts = await db.select().from(receiptsTable).where(eq(receiptsTable.userId, req.userId));

  const byMonth: Record<string, number> = {};
  for (const r of receipts) {
    const month = r.purchaseDate?.slice(0, 7) ?? 'unknown';
    byMonth[month] = (byMonth[month] ?? 0) + Number(r.total ?? 0);
  }

  const result = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total: total.toFixed(2) }));

  res.json(result);
  return;
});

router.get('/by-store', requireAuth, async (req, res): Promise<void> => {
  const receipts = await db.select().from(receiptsTable).where(eq(receiptsTable.userId, req.userId));

  const byStore: Record<string, number> = {};
  for (const r of receipts) {
    const store = r.storeName ?? 'Unknown';
    byStore[store] = (byStore[store] ?? 0) + Number(r.total ?? 0);
  }

  const result = Object.entries(byStore)
    .sort(([, a], [, b]) => b - a)
    .map(([store, total]) => ({ store, total: total.toFixed(2) }));

  res.json(result);
  return;
});

router.get('/by-category', requireAuth, async (req, res): Promise<void> => {
  const receipts = await db.select().from(receiptsTable).where(eq(receiptsTable.userId, req.userId));
  const receiptIds = receipts.map(r => r.id);

  const allItems = [];
  for (const id of receiptIds) {
    const items = await db.select().from(receiptItemsTable).where(eq(receiptItemsTable.receiptId, id));
    allItems.push(...items);
  }

  const byCategory: Record<string, number> = {};
  for (const item of allItems) {
    const cat = item.category ?? 'Other';
    byCategory[cat] = (byCategory[cat] ?? 0) + Number(item.price ?? 0);
  }

  const result = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([category, total]) => ({ category, total: total.toFixed(2) }));

  res.json(result);
  return;
});

router.post('/price-history', requireAuth, async (req, res): Promise<void> => {
  const [entry] = await db.insert(priceHistoryTable).values({
    id: crypto.randomUUID(),
    userId: req.userId,
    ...req.body,
  }).returning();
  res.json(serialize(entry));
  return;
});

router.get('/price-history', requireAuth, async (req, res): Promise<void> => {
  const { item } = req.query as { item?: string };
  let rows = await db.select().from(priceHistoryTable).where(eq(priceHistoryTable.userId, req.userId));
  if (item) rows = rows.filter(r => r.itemName.toLowerCase().includes(item.toLowerCase()));
  res.json(serialize(rows));
  return;
});

export default router;
