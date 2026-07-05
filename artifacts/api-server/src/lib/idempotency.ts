import { db, pantryEventsTable, type PantryEventType } from '@workspace/db';
import { and, eq } from 'drizzle-orm';

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// RC2 canon §11.2 — same key + same payload is a no-op success (duplicate);
// same key + different payload is a rejected conflict, logged server-side.
export class IdempotencyConflictError extends Error {
  constructor(public readonly idempotencyKey: string) {
    super(`Idempotency conflict: key "${idempotencyKey}" was already used with a different request`);
    this.name = 'IdempotencyConflictError';
  }
}

interface ResolveIdempotencyInput {
  tx: DbTransaction;
  householdId: string;
  eventType: PantryEventType;
  idempotencyKey: string;
  // Caller-defined "what makes this the same logical request" — compared
  // against metadata.idempotency_payload on the existing event, NOT the
  // resulting quantity_delta. The delta can legitimately differ between a
  // first attempt and a retry if pantry state changed in between (e.g. the
  // zero-floor clamp in pantry-deduction.ts kicking in differently).
  comparisonPayload: Record<string, unknown>;
}

export async function resolveIdempotency(
  input: ResolveIdempotencyInput,
): Promise<{ duplicate: boolean; existing: typeof pantryEventsTable.$inferSelect | null }> {
  const { tx, householdId, eventType, idempotencyKey, comparisonPayload } = input;

  const [existing] = await tx
    .select()
    .from(pantryEventsTable)
    .where(
      and(
        eq(pantryEventsTable.householdId, householdId),
        eq(pantryEventsTable.eventType, eventType),
        eq(pantryEventsTable.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);

  if (!existing) {
    return { duplicate: false, existing: null };
  }

  const existingPayload = (existing.metadata as Record<string, unknown> | null)?.['idempotency_payload'];
  const samePayload = JSON.stringify(existingPayload) === JSON.stringify(comparisonPayload);

  if (!samePayload) {
    throw new IdempotencyConflictError(idempotencyKey);
  }

  return { duplicate: true, existing };
}

// Postgres unique_violation — the last-resort guard against a genuine race
// between two concurrent requests carrying the same idempotency key, since
// the app-level check above can't fully close that window by itself. Backed
// by the composite unique index from ticket 2.
export function isUniqueConstraintViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: unknown }).code === '23505';
}
