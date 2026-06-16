import { pgTable, text, timestamp, integer, decimal } from 'drizzle-orm/pg-core';

export const pantryItemsTable = pgTable('pantry_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  brand: text('brand'),
  barcode: text('barcode'),
  category: text('category').default('other'),
  storageArea: text('storage_area').default('pantry'),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).default('0'),
  unit: text('unit').default('count'),
  parQuantity: decimal('par_quantity', { precision: 10, scale: 2 }),
  expiryDate: text('expiry_date'),
  notes: text('notes'),
  imageUrl: text('image_url'),
  purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }),
  purchaseStore: text('purchase_store'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
