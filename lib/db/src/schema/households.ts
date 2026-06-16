import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const householdsTable = pgTable('households', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const householdMembersTable = pgTable('household_members', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role').default('member'),
  joinedAt: timestamp('joined_at').defaultNow(),
});

export const householdInvitesTable = pgTable('household_invites', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull(),
  email: text('email').notNull(),
  token: text('token').unique().notNull(),
  isAccepted: boolean('is_accepted').default(false),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
