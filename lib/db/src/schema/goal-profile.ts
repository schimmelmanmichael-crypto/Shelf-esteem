import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Canonical GoalProfile modes per RC2 canon §5.8/§3.18.
export const GOAL_PROFILE_MODES = [
  'balanced',
  'reduce_waste',
  'save_money',
  'fast_dinner',
  'household_harmony',
] as const;

export type GoalProfileMode = (typeof GOAL_PROFILE_MODES)[number];

// RC2 canon §11.9 — GoalProfile is household-level for Phase 1: one active
// GoalProfile per Household (enforced here via a unique householdId), member-
// level goals are future. Phase 1 may implement only 'balanced' (§5.8).
export const goalProfilesTable = pgTable('goal_profiles', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().unique(),
  mode: text('mode').notNull().default('balanced'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
