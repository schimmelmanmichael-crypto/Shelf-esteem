import { Router } from 'express';
import {
  db,
  pantryItemsTable,
  pantryEventsTable,
  shoppingItemsTable,
  mealPlansTable,
  leftoversTable,
  missedOpportunitiesTable,
  receiptsTable,
  receiptItemsTable,
  weeklyAdsTable,
  weeklyAdItemsTable,
  priceHistoryTable,
  priceAlertsTable,
} from '@workspace/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { logger } from '../lib/logger.js';

const router: Router = Router();

router.post('/reset', requireAuth, async (req, res): Promise<void> => {
  const uid = req.userId;
  logger.info({ userId: uid }, 'Data reset requested');

  try {
    await db.delete(pantryItemsTable).where(eq(pantryItemsTable.userId, uid));
    // pantry_events has no userId column (RC2 canon models it as household-owned) —
    // scoped by createdByUserAccountId to match this route's existing per-user
    // (not per-household) reset granularity. Chosen per explicit approval: this
    // is a full user-facing "reset my data" action, so it also erases event
    // history for this user, overriding canon §3.3's normal immutability rule.
    await db.delete(pantryEventsTable).where(eq(pantryEventsTable.createdByUserAccountId, uid));
    await db.delete(shoppingItemsTable).where(eq(shoppingItemsTable.userId, uid));
    await db.delete(mealPlansTable).where(eq(mealPlansTable.userId, uid));
    await db.delete(leftoversTable).where(eq(leftoversTable.userId, uid));
    await db.delete(missedOpportunitiesTable).where(eq(missedOpportunitiesTable.userId, uid));
    await db.delete(receiptsTable).where(eq(receiptsTable.userId, uid));
    await db.delete(receiptItemsTable).where(eq(receiptItemsTable.userId, uid));
    await db.delete(weeklyAdsTable).where(eq(weeklyAdsTable.userId, uid));
    await db.delete(weeklyAdItemsTable).where(eq(weeklyAdItemsTable.userId, uid));
    await db.delete(priceHistoryTable).where(eq(priceHistoryTable.userId, uid));
    await db.delete(priceAlertsTable).where(eq(priceAlertsTable.userId, uid));

    logger.info({ userId: uid }, 'Data reset complete');
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, userId: uid }, 'Data reset failed');
    res.status(500).json({ error: 'Reset failed' });
  }
  return;
});

export default router;
