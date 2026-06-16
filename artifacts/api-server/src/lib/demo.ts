import { db, pantryItemsTable, recipesTable, shoppingItemsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from './logger.js';

const DEMO_PANTRY = [
  { name: 'Chicken Breast', category: 'proteins', unit: 'lb', quantity: '2', storageArea: 'fridge', expiryDate: '2026-06-20' },
  { name: 'Brown Rice', category: 'grains', unit: 'cup', quantity: '3', storageArea: 'pantry' },
  { name: 'Broccoli', category: 'produce', unit: 'count', quantity: '1', storageArea: 'fridge', expiryDate: '2026-06-18' },
  { name: 'Olive Oil', category: 'other', unit: 'fl_oz', quantity: '16', storageArea: 'pantry' },
  { name: 'Garlic', category: 'produce', unit: 'count', quantity: '5', storageArea: 'pantry' },
  { name: 'Canned Tomatoes', category: 'canned', unit: 'count', quantity: '3', storageArea: 'pantry' },
  { name: 'Pasta', category: 'grains', unit: 'oz', quantity: '16', storageArea: 'pantry' },
  { name: 'Parmesan', category: 'dairy', unit: 'oz', quantity: '4', storageArea: 'fridge' },
];

export async function activateDemo(userId: string): Promise<void> {
  for (const item of DEMO_PANTRY) {
    await db.insert(pantryItemsTable).values({
      id: crypto.randomUUID(),
      userId,
      ...item,
    });
  }
  logger.info({ userId }, 'Demo activated');
}

export async function restoreFromDemo(userId: string): Promise<void> {
  await db.delete(pantryItemsTable).where(eq(pantryItemsTable.userId, userId));
  await db.delete(shoppingItemsTable).where(eq(shoppingItemsTable.userId, userId));
  logger.info({ userId }, 'Demo restored (data cleared)');
}
