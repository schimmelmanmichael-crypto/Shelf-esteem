import { pgTable, text, timestamp, integer, decimal } from 'drizzle-orm/pg-core';

export const leftoversTable = pgTable('leftovers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  householdId: text('household_id'),
  mealName: text('meal_name').notNull(),
  recipeId: text('recipe_id'),
  // RC2 canon §5.7/§3.13 — schema readiness for splitting one leftover into
  // multiple containers (e.g. some to fridge, some to freezer). The split
  // feature itself is deferred to Phase 1b (§11.5); this column just ensures
  // the model doesn't block it later.
  parentLeftoverId: text('parent_leftover_id'),
  servingsAvailable: integer('servings_available').default(0),
  servingsOriginal: integer('servings_original'),
  costPerServing: decimal('cost_per_serving', { precision: 10, scale: 2 }),
  storageLocation: text('storage_location').default('fridge'),
  expirationDate: text('expiration_date'),
  status: text('status').default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const missedOpportunitiesTable = pgTable('missed_opportunities', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  householdId: text('household_id'),
  leftoverId: text('leftover_id'),
  mealName: text('meal_name').notNull(),
  servingsLost: integer('servings_lost').default(0),
  dollarValueLost: decimal('dollar_value_lost', { precision: 10, scale: 2 }),
  dateLost: text('date_lost').notNull(),
  reason: text('reason').default('manual'),
  createdAt: timestamp('created_at').defaultNow(),
});
