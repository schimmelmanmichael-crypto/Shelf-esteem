import { db, pantryItemsTable, pantryEventsTable, recipesTable, shoppingItemsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from './logger.js';
import { getOrCreateHouseholdId } from './household.js';
import { recordPantryEvent } from './pantryEvents.js';

function daysFromNow(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function buildDemoPantry() {
  return [
    { name: 'Chicken Breast', category: 'proteins', unit: 'lb', quantity: '2', storageArea: 'fridge', expiryDate: daysFromNow(2) },
    { name: 'Brown Rice', category: 'grains', unit: 'cup', quantity: '3', storageArea: 'pantry' },
    { name: 'Broccoli', category: 'produce', unit: 'count', quantity: '1', storageArea: 'fridge', expiryDate: daysFromNow(-1) },
    { name: 'Olive Oil', category: 'other', unit: 'fl_oz', quantity: '16', storageArea: 'pantry' },
    { name: 'Garlic', category: 'produce', unit: 'count', quantity: '5', storageArea: 'pantry' },
    { name: 'Canned Tomatoes', category: 'canned', unit: 'count', quantity: '3', storageArea: 'pantry' },
    { name: 'Pasta', category: 'grains', unit: 'oz', quantity: '16', storageArea: 'pantry' },
    { name: 'Parmesan', category: 'dairy', unit: 'oz', quantity: '4', storageArea: 'fridge' },
  ];
}

export async function activateDemo(userId: string): Promise<void> {
  const householdId = await getOrCreateHouseholdId(userId);

  for (const item of buildDemoPantry()) {
    const itemId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(pantryItemsTable).values({
        id: itemId,
        userId,
        householdId,
        ...item,
      });

      // RC2 canon §3.2 — demo seeding adds food to pantry via an Acquire event.
      await recordPantryEvent({
        tx,
        householdId,
        pantryItemId: itemId,
        eventType: 'acquire',
        quantityDelta: parseFloat(item.quantity),
        unit: item.unit,
        source: 'demo_seed',
        idempotencyKey: crypto.randomUUID(),
        createdByUserAccountId: userId,
        metadata: { source_type: 'demo_seed' },
      });
    });
  }
  logger.info({ userId }, 'Demo activated');
}

export async function restoreFromDemo(userId: string): Promise<void> {
  await db.delete(pantryItemsTable).where(eq(pantryItemsTable.userId, userId));
  // Same precedent as dataReset.ts: demo data is throwaway, so exiting demo
  // mode also clears this user's pantry_events rather than leaving orphaned
  // fake-acquisition history with no matching current-state row. Matches this
  // function's existing scope exactly (it already unconditionally wipes all
  // of this user's pantry_items/shopping_items, demo-sourced or not).
  await db.delete(pantryEventsTable).where(eq(pantryEventsTable.createdByUserAccountId, userId));
  await db.delete(shoppingItemsTable).where(eq(shoppingItemsTable.userId, userId));
  logger.info({ userId }, 'Demo restored (data cleared)');
}
