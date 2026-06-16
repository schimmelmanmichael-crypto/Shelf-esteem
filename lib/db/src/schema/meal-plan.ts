import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const mealPlansTable = pgTable('meal_plans', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  date: text('date').notNull(),
  mealSlot: text('meal_slot').notNull(),
  mealType: text('meal_type').default('recipe'),
  recipeId: text('recipe_id'),
  leftoverId: text('leftover_id'),
  customName: text('custom_name'),
  servings: integer('servings').default(1),
  isCooked: boolean('is_cooked').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
