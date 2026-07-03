import { pgTable, text, timestamp, decimal, integer } from 'drizzle-orm/pg-core';

export const receiptsTable = pgTable('receipts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  householdId: text('household_id'),
  storeName: text('store_name'),
  purchaseDate: text('purchase_date'),
  total: decimal('total', { precision: 10, scale: 2 }),
  imageUrl: text('image_url'),
  rawText: text('raw_text'),
  status: text('status').default('pending'),
  itemCount: integer('item_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const receiptItemsTable = pgTable('receipt_items', {
  id: text('id').primaryKey(),
  receiptId: text('receipt_id').notNull(),
  userId: text('user_id').notNull(),
  householdId: text('household_id'),
  name: text('name').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).default('1'),
  unit: text('unit'),
  price: decimal('price', { precision: 10, scale: 2 }),
  category: text('category'),
  addedToPantry: text('added_to_pantry').default('no'),
  createdAt: timestamp('created_at').defaultNow(),
});
