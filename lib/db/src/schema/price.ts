import { pgTable, text, timestamp, decimal, boolean } from 'drizzle-orm/pg-core';

export const priceHistoryTable = pgTable('price_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemName: text('item_name').notNull(),
  barcode: text('barcode'),
  storeName: text('store_name').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  unit: text('unit'),
  purchaseDate: text('purchase_date').notNull(),
  receiptId: text('receipt_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const priceAlertsTable = pgTable('price_alerts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemName: text('item_name').notNull(),
  barcode: text('barcode'),
  targetPrice: decimal('target_price', { precision: 10, scale: 2 }).notNull(),
  storeName: text('store_name'),
  isActive: boolean('is_active').default(true),
  lastTriggeredAt: timestamp('last_triggered_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
