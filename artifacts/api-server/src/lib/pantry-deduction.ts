import { db, pantryItemsTable, shoppingItemsTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { logger } from './logger.js';
import crypto from 'crypto';

const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  tsp:   { tsp: 1, tbsp: 1/3, cup: 1/48, ml: 4.929, fl_oz: 1/6, oz: 1/6 },
  tbsp:  { tsp: 3, tbsp: 1, cup: 1/16, ml: 14.787, fl_oz: 0.5, oz: 0.5 },
  cup:   { tsp: 48, tbsp: 16, cup: 1, ml: 236.588, fl_oz: 8, oz: 8 },
  ml:    { tsp: 0.2029, tbsp: 0.0676, cup: 0.00423, ml: 1, fl_oz: 0.0338 },
  fl_oz: { tsp: 6, tbsp: 2, cup: 0.125, ml: 29.574, fl_oz: 1, oz: 1 },
  oz:    { oz: 1, lb: 0.0625, g: 28.3495, kg: 0.0283, fl_oz: 1 },
  lb:    { oz: 16, lb: 1, g: 453.592, kg: 0.4536 },
  g:     { oz: 0.0353, lb: 0.0022, g: 1, kg: 0.001 },
  kg:    { oz: 35.274, lb: 2.2046, g: 1000, kg: 1 },
  count: { count: 1 },
  each:  { count: 1, each: 1 },
};

function convertUnits(amount: number, fromUnit: string, toUnit: string): number | null {
  const from = fromUnit.toLowerCase().trim();
  const to   = toUnit.toLowerCase().trim();
  if (from === to) return amount;
  const conversions = UNIT_CONVERSIONS[from];
  if (!conversions || conversions[to] === undefined) return null;
  return amount * conversions[to];
}

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

export async function applyPantryDeduction(
  userId: string,
  ingredients: Ingredient[],
  servings: number
): Promise<{ deducted: string[]; addedToShopping: string[] }> {
  const deducted: string[] = [];
  const addedToShopping: string[] = [];

  for (const ingredient of ingredients) {
    const [pantryItem] = await db
      .select()
      .from(pantryItemsTable)
      .where(
        and(
          eq(pantryItemsTable.userId, userId),
          eq(pantryItemsTable.name, ingredient.name)
        )
      )
      .limit(1);

    let recipeAmountInPantryUnits = ingredient.quantity * servings;

    if (pantryItem && pantryItem.unit && pantryItem.unit !== ingredient.unit) {
      const converted = convertUnits(
        ingredient.quantity * servings,
        ingredient.unit,
        pantryItem.unit
      );
      if (converted !== null) {
        recipeAmountInPantryUnits = converted;
      }
    }

    if (pantryItem) {
      const currentQty = parseFloat(pantryItem.quantity?.toString() ?? '0');
      const newQty = Math.max(0, currentQty - recipeAmountInPantryUnits);

      await db
        .update(pantryItemsTable)
        .set({ quantity: newQty.toString(), updatedAt: new Date() })
        .where(eq(pantryItemsTable.id, pantryItem.id));

      deducted.push(ingredient.name);

      if (newQty === 0) {
        addedToShopping.push(ingredient.name);
        await db.insert(shoppingItemsTable).values({
          id: crypto.randomUUID(),
          userId,
          name: ingredient.name,
          quantity: '1',
          unit: ingredient.unit ?? 'count',
          addedFrom: 'recipe-cook',
        }).onConflictDoNothing();
      }
    } else {
      addedToShopping.push(ingredient.name);
      await db.insert(shoppingItemsTable).values({
        id: crypto.randomUUID(),
        userId,
        name: ingredient.name,
        quantity: (ingredient.quantity * servings).toString(),
        unit: ingredient.unit ?? 'count',
        addedFrom: 'recipe-cook',
      }).onConflictDoNothing();
    }
  }

  logger.info({ userId, deducted: deducted.length, addedToShopping: addedToShopping.length }, 'Pantry deduction complete');
  return { deducted, addedToShopping };
}
