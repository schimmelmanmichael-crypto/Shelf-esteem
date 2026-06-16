import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const pantrySnapshotsTable = pgTable('pantry_snapshots', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  snapshotDate: text('snapshot_date').notNull(),
  itemCount: integer('item_count').default(0),
  totalValue: text('total_value'),
  snapshotData: text('snapshot_data'),
  createdAt: timestamp('created_at').defaultNow(),
});
