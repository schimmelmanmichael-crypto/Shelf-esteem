import { pgTable, text, timestamp, decimal } from 'drizzle-orm/pg-core';

export const weeklyAdsTable = pgTable('weekly_ads', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  storeName: text('store_name').notNull(),
  weekOf: text('week_of'),
  imageUrl: text('image_url'),
  sourceUrl: text('source_url'),
  rawText: text('raw_text'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const weeklyAdItemsTable = pgTable('weekly_ad_items', {
  id: text('id').primaryKey(),
  weeklyAdId: text('weekly_ad_id').notNull(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  salePrice: decimal('sale_price', { precision: 10, scale: 2 }),
  regularPrice: decimal('regular_price', { precision: 10, scale: 2 }),
  unit: text('unit'),
  category: text('category'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});
