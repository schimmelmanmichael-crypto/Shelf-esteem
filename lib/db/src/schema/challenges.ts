import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const cookingChallengesTable = pgTable('cooking_challenges', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  startsAt: text('starts_at'),
  endsAt: text('ends_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const challengeSubmissionsTable = pgTable('challenge_submissions', {
  id: text('id').primaryKey(),
  challengeId: text('challenge_id').notNull(),
  userId: text('user_id'),
  displayName: text('display_name'),
  title: text('title').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  voteCount: integer('vote_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const challengeVotesTable = pgTable('challenge_votes', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id').notNull(),
  userId: text('user_id'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});
