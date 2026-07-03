import { db, usersTable, householdsTable, householdMembersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Households are opt-in today — only routes/household.ts explicitly creates one.
// Every pantry event needs a household_id (RC2 canon §5.1/§3.19), so this lazily
// provisions a household the first time one is needed, instead of requiring a
// separate upfront backfill migration.
export async function getOrCreateHouseholdId(userId: string): Promise<string> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (user?.householdId) {
    return user.householdId;
  }

  const householdId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(householdsTable).values({ id: householdId, name: 'My Household', ownerId: userId });
    await tx.insert(householdMembersTable).values({ id: crypto.randomUUID(), householdId, userId, role: 'owner' });
    await tx.update(usersTable).set({ householdId, updatedAt: new Date() }).where(eq(usersTable.id, userId));
  });

  return householdId;
}
