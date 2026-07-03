import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const receiptCodeMapTable = pgTable('receipt_code_map', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  householdId: text('household_id'),
  receiptCode: text('receipt_code').notNull(),
  itemName: text('item_name').notNull(),
  category: text('category'),
  brand: text('brand'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
