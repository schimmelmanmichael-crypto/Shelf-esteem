import { Router } from 'express';
import { db, pantryItemsTable, weeklyAdItemsTable, weeklyAdsTable, priceHistoryTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';

const router: Router = Router();

router.get('/', requireAuth, async (req, res): Promise<void> => {
  const pantryItems = await db.select().from(pantryItemsTable).where(eq(pantryItemsTable.userId, req.userId));
  const pantryNames = new Set(pantryItems.map(i => i.name.toLowerCase()));

  const ads = await db.select().from(weeklyAdsTable).where(eq(weeklyAdsTable.userId, req.userId));
  const deals = [];

  for (const ad of ads) {
    const items = await db.select().from(weeklyAdItemsTable).where(eq(weeklyAdItemsTable.weeklyAdId, ad.id));
    for (const item of items) {
      if (pantryNames.has(item.name.toLowerCase())) {
        deals.push({ ...item, storeName: ad.storeName, weekOf: ad.weekOf });
      }
    }
  }

  res.json(serialize(deals));
  return;
});

router.get('/price-comparison', requireAuth, async (req, res): Promise<void> => {
  const { item } = req.query as { item?: string };
  if (!item) { res.status(400).json({ error: 'item query param required' }); return; }

  const history = await db.select().from(priceHistoryTable)
    .where(eq(priceHistoryTable.userId, req.userId));

  const filtered = history.filter(h => h.itemName.toLowerCase().includes(item.toLowerCase()));
  const byStore = filtered.reduce<Record<string, { store: string; prices: number[]; lowest: number }>>((acc, h) => {
    const store = h.storeName;
    if (!acc[store]) acc[store] = { store, prices: [], lowest: Infinity };
    const price = Number(h.price);
    acc[store].prices.push(price);
    if (price < acc[store].lowest) acc[store].lowest = price;
    return acc;
  }, {});

  res.json(Object.values(byStore));
  return;
});

export default router;
