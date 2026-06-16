import cron from 'node-cron';
import { db, usersTable } from '@workspace/db';
import { eq, and, lte, isNull, or } from 'drizzle-orm';
import { sendEmail } from './resendClient.js';
import { day7Email, day14Email } from './emailTemplates.js';
import { logger } from '../logger.js';
import { sql } from 'drizzle-orm';

const CUTOFF_DATE = new Date('2026-06-11');

export function startEmailCron(): void {
  cron.schedule('0 9 * * *', async () => {
    logger.info('Email sequence cron starting');
    try {
      const now = new Date();
      const day7Cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const day14Cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const day7Users = await db
        .select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.day7EmailSent, false),
            lte(usersTable.createdAt, day7Cutoff),
            sql`${usersTable.createdAt} >= ${CUTOFF_DATE}`
          )
        );

      for (const user of day7Users) {
        const tmpl = day7Email(user.displayName ?? user.email);
        const sent = await sendEmail({ to: user.email, ...tmpl });
        if (sent) {
          await db.update(usersTable).set({ day7EmailSent: true }).where(eq(usersTable.id, user.id));
          logger.info({ userId: user.id }, 'Day-7 email sent');
        }
      }

      const day14Users = await db
        .select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.day14EmailSent, false),
            lte(usersTable.createdAt, day14Cutoff),
            sql`${usersTable.createdAt} >= ${CUTOFF_DATE}`
          )
        );

      for (const user of day14Users) {
        const tmpl = day14Email(user.displayName ?? user.email);
        const sent = await sendEmail({ to: user.email, ...tmpl });
        if (sent) {
          await db.update(usersTable).set({ day14EmailSent: true }).where(eq(usersTable.id, user.id));
          logger.info({ userId: user.id }, 'Day-14 email sent');
        }
      }

      logger.info({ day7: day7Users.length, day14: day14Users.length }, 'Email cron complete');
    } catch (err) {
      logger.error({ err }, 'Email cron error');
    }
  });
}
