import crypto from 'crypto';
import { db, pantryEventsTable, type PantryEventType, type PantryEventReasonCode } from '@workspace/db';

// Transaction handle type, derived from db.transaction itself so it always
// matches whatever Drizzle/postgres-js version is installed.
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface RecordPantryEventInput {
  tx: DbTransaction;
  householdId: string;
  pantryItemId?: string | null;
  leftoverId?: string | null;
  eventType: PantryEventType;
  quantityDelta: number;
  unit: string;
  source: string;
  idempotencyKey: string;
  createdByUserAccountId?: string | null;
  affectedHouseholdMemberId?: string | null;
  reasonCode?: PantryEventReasonCode | null;
  metadata: Record<string, unknown>;
}

// Inserts one immutable PantryEvent row (RC2 canon §3.2/§3.3/§5.2). Callers
// pass their own transaction handle so the event insert and the pantry_items
// (or leftovers) projection update commit together, per canon §3.4.
export async function recordPantryEvent(input: RecordPantryEventInput) {
  const { tx, metadata, quantityDelta, ...rest } = input;
  const [event] = await tx
    .insert(pantryEventsTable)
    .values({
      id: crypto.randomUUID(),
      ...rest,
      quantityDelta: quantityDelta.toString(),
      metadata,
    })
    .returning();
  return event;
}
