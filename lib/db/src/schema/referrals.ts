import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const referralsTable = pgTable('referrals', {
  id: text('id').primaryKey(),
  referrerId: text('referrer_id').notNull(),
  referredUserId: text('referred_user_id').notNull(),
  referralCode: text('referral_code').notNull(),
  status: text('status').default('pending'),
  rewardGrantedAt: timestamp('reward_granted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
