import { pgTable, text, timestamp, integer, decimal, boolean } from 'drizzle-orm/pg-core';

export const recipesTable = pgTable('recipes', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').default('other'),
  servings: integer('servings').default(4),
  prepTime: integer('prep_time'),
  cookTime: integer('cook_time'),
  instructions: text('instructions'),
  tips: text('tips'),
  imageUrl: text('image_url'),
  sourceUrl: text('source_url'),
  rating: decimal('rating', { precision: 3, scale: 1 }),
  isFavorite: boolean('is_favorite').default(false),
  isGlobal: boolean('is_global').default(false),
  timesCooked: integer('times_cooked').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const recipeIngredientsTable = pgTable('recipe_ingredients', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id').notNull(),
  name: text('name').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }),
  unit: text('unit').default('count'),
  notes: text('notes'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});
