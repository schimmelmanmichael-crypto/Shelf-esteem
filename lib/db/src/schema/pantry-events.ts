import { pgTable, text, timestamp, decimal, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

// Canonical reason_code values per RC2 canon §11.1 — no writer may invent new
// strings without a canon update.
export const PANTRY_EVENT_REASON_CODES = [
  'spoiled',
  'expired',
  'user_correction',
  'migration_backfill',
  'returned_to_store',
  'admin_repair',
  'duplicate_entry',
  'quantity_adjustment',
  'location_change',
  'freshness_override',
  'damaged',
  'unknown',
] as const;

export type PantryEventReasonCode = (typeof PANTRY_EVENT_REASON_CODES)[number];

// Canonical event_type values per RC2 canon §3.2 (ADR-024).
export const PANTRY_EVENT_TYPES = ['acquire', 'consume', 'transform', 'discard', 'reconcile'] as const;

export type PantryEventType = (typeof PANTRY_EVENT_TYPES)[number];

export const pantryEventsTable = pgTable(
  'pantry_events',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull(),
    pantryItemId: text('pantry_item_id'),
    leftoverId: text('leftover_id'),
    eventType: text('event_type').notNull(),
    quantityDelta: decimal('quantity_delta', { precision: 10, scale: 2 }).notNull(),
    unit: text('unit').notNull(),
    source: text('source').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    createdByUserAccountId: text('created_by_user_account_id'),
    affectedHouseholdMemberId: text('affected_household_member_id'),
    reasonCode: text('reason_code'),
    metadata: jsonb('metadata').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    // RC2 canon §11.2 — idempotency uniqueness scope is household_id + action_type + idempotency_key.
    // "action_type" in §11.2 maps to this table's event_type field (§5.2 has no separate action_type column).
    uniqueIndex('pantry_events_household_event_idempotency_idx').on(
      table.householdId,
      table.eventType,
      table.idempotencyKey,
    ),
  ],
);
