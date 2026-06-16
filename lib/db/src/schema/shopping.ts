import { pgTable, text, timestamp, decimal, boolean } from 'drizzle-orm/pg-core';

export const shoppingItemsTable = pgTable('shopping_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  brand: text('brand'),
  category: text('category').default('other'),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).default('1'),
  unit: text('unit').default('count'),
  estimatedPrice: decimal('estimated_price', { precision: 10, scale: 2 }),
  isChecked: boolean('is_checked').default(false),
  addedFrom: text('added_from'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
