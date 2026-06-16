import cron from 'node-cron';
import { db, leftoversTable, missedOpportunitiesTable } from '@workspace/db';
import { eq, and, lte, gt } from 'drizzle-orm';
import { logger } from '../logger.js';
import crypto from 'crypto';

export function startLeftoverCron(): void {
  cron.schedule('0 6 * * *', async () => {
    logger.info('Leftover expiry check starting');
    try {
      const today = new Date().toISOString().split('T')[0];

      const expiredLeftovers = await db
        .select()
        .from(leftoversTable)
        .where(
          and(
            eq(leftoversTable.status, 'active'),
            lte(leftoversTable.expirationDate, today),
            gt(leftoversTable.servingsAvailable, 0)
          )
        );

      for (const leftover of expiredLeftovers) {
        const servingsLost = leftover.servingsAvailable ?? 0;
        const dollarValueLost = leftover.costPerServing
          ? (Number(leftover.costPerServing) * servingsLost).toString()
          : '0';

        await db.insert(missedOpportunitiesTable).values({
          id: crypto.randomUUID(),
          userId:          leftover.userId,
          leftoverId:      leftover.id,
          mealName:        leftover.mealName,
          servingsLost,
          dollarValueLost,
          dateLost:        today ?? '',
          reason:          'expired',
        }).onConflictDoNothing();

        await db
          .update(leftoversTable)
          .set({ status: 'expired', servingsAvailable: 0, updatedAt: new Date() })
          .where(eq(leftoversTable.id, leftover.id));

        logger.info({ leftoverId: leftover.id, servingsLost }, 'Auto-logged expired leftover');
      }

      logger.info({ processed: expiredLeftovers.length }, 'Leftover expiry check complete');
    } catch (err) {
      logger.error({ err }, 'Leftover expiry cron error');
    }
  });
}
