import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const communityRecipesTable = pgTable('community_recipes', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  displayName: text('display_name'),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  servings: integer('servings'),
  ingredients: text('ingredients'),
  instructions: text('instructions'),
  likeCount: integer('like_count').default(0),
  commentCount: integer('comment_count').default(0),
  isApproved: boolean('is_approved').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const communityCommentsTable = pgTable('community_comments', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull(),
  postType: text('post_type').notNull(),
  userId: text('user_id'),
  displayName: text('display_name'),
  body: text('body').notNull(),
  helpfulCount: integer('helpful_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const saleAlertsTable = pgTable('sale_alerts', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  displayName: text('display_name'),
  storeName: text('store_name').notNull(),
  itemName: text('item_name').notNull(),
  salePrice: text('sale_price'),
  regularPrice: text('regular_price'),
  zipCode: text('zip_code'),
  expiresAt: text('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pantrySharesTable = pgTable('pantry_shares', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  displayName: text('display_name'),
  itemName: text('item_name').notNull(),
  quantity: text('quantity'),
  isFree: boolean('is_free').default(true),
  tradeFor: text('trade_for'),
  zipCode: text('zip_code'),
  isAvailable: boolean('is_available').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
