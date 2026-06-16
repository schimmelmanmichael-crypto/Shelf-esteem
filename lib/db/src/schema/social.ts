import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const gadgetPostsTable = pgTable('gadget_posts', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  displayName: text('display_name'),
  title: text('title').notNull(),
  brand: text('brand'),
  price: text('price'),
  discountCode: text('discount_code'),
  postType: text('post_type').default('recommend'),
  notes: text('notes'),
  likeCount: integer('like_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const groupEventsTable = pgTable('group_events', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  displayName: text('display_name'),
  title: text('title').notNull(),
  description: text('description'),
  eventDate: text('event_date'),
  maxMembers: integer('max_members'),
  currentMembers: integer('current_members').default(1),
  zipCode: text('zip_code'),
  isOpen: boolean('is_open').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const qaPostsTable = pgTable('qa_posts', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  displayName: text('display_name'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  isResolved: boolean('is_resolved').default(false),
  helpfulCount: integer('helpful_count').default(0),
  replyCount: integer('reply_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
