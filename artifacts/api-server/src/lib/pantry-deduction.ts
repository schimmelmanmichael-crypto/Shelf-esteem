import { db, pantryItemsTable, shoppingItemsTable, leftoversTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { logger } from './logger.js';
import { recordPantryEvent } from './pantryEvents.js';
import { resolveIdempotency } from './idempotency.js';
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
  householdId: string,
  ingredients: Ingredient[],
  servings: number,
  recipeId: string,
  cookSessionId: string,
  leftoverServings = 0,
  recipeName?: string
): Promise<{ deducted: string[]; addedToShopping: string[]; leftoverId: string | null }> {
  const deducted: string[] = [];
  const addedToShopping: string[] = [];
  let leftoverId: string | null = null;

  // RC2 canon §3.7/§11.7 — recipe execution (every ingredient's Consume event,
  // plus the Transform event and Leftover creation when leftovers are made)
  // is one atomic transaction: all of it commits, or none of it does. This
  // replaces the earlier per-ingredient transactions, which didn't actually
  // satisfy "all Consume events commit or none" for a whole recipe.
  await db.transaction(async (tx) => {
    for (const ingredient of ingredients) {
      const [pantryItem] = await tx
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
        const consumedAmount = currentQty - newQty;
        const idempotencyKey = `${cookSessionId}:${pantryItem.id}`;
        // What defines "the same request" for this ingredient — deliberately
        // not quantityDelta/newQty, since those are derived from currentQty at
        // call time and can legitimately differ on a retry (e.g. the zero-floor
        // clamp above triggering differently the second time).
        const comparisonPayload = {
          recipeId,
          ingredientName: ingredient.name,
          requestedQuantity: ingredient.quantity,
          requestedUnit: ingredient.unit,
          servings,
        };

        const { duplicate } = await resolveIdempotency({
          tx,
          householdId,
          eventType: 'consume',
          idempotencyKey,
          comparisonPayload,
        });

        if (!duplicate) {
          await tx
            .update(pantryItemsTable)
            .set({ quantity: newQty.toString(), updatedAt: new Date() })
            .where(eq(pantryItemsTable.id, pantryItem.id));

          // RC2 canon §3.2 — cooking a recipe is a Consume event.
          await recordPantryEvent({
            tx,
            householdId,
            pantryItemId: pantryItem.id,
            eventType: 'consume',
            quantityDelta: -consumedAmount,
            unit: pantryItem.unit ?? 'count',
            source: 'recipe_cook',
            idempotencyKey,
            createdByUserAccountId: userId,
            metadata: {
              source_type: 'recipe_cook',
              recipe_id: recipeId,
              cook_session_id: cookSessionId,
              idempotency_payload: comparisonPayload,
            },
          });
        }

        deducted.push(ingredient.name);

        if (newQty === 0) {
          addedToShopping.push(ingredient.name);
          await tx.insert(shoppingItemsTable).values({
            id: crypto.randomUUID(),
            userId,
            householdId,
            name: ingredient.name,
            quantity: '1',
            unit: ingredient.unit ?? 'count',
            addedFrom: 'recipe-cook',
          }).onConflictDoNothing();
        }
      } else {
        addedToShopping.push(ingredient.name);
        await tx.insert(shoppingItemsTable).values({
          id: crypto.randomUUID(),
          userId,
          householdId,
          name: ingredient.name,
          quantity: (ingredient.quantity * servings).toString(),
          unit: ingredient.unit ?? 'count',
          addedFrom: 'recipe-cook',
        }).onConflictDoNothing();
      }
    }

    if (leftoverServings > 0) {
      const leftoverIdempotencyKey = `${cookSessionId}:leftover`;
      const leftoverComparisonPayload = { recipeId, leftoverServings };

      const { duplicate, existing } = await resolveIdempotency({
        tx,
        householdId,
        eventType: 'transform',
        idempotencyKey: leftoverIdempotencyKey,
        comparisonPayload: leftoverComparisonPayload,
      });

      if (duplicate) {
        leftoverId = existing?.leftoverId ?? null;
      } else {
        const newLeftoverId = crypto.randomUUID();

        await tx.insert(leftoversTable).values({
          id: newLeftoverId,
          userId,
          householdId,
          mealName: recipeName ?? 'Cooked meal',
          recipeId,
          servingsAvailable: leftoverServings,
          servingsOriginal: leftoverServings,
        });

        // RC2 canon §3.2/§3.12 — cooking a meal and saving leftovers is a
        // Transform event ("meal -> leftovers"), atomic with everything above.
        await recordPantryEvent({
          tx,
          householdId,
          leftoverId: newLeftoverId,
          eventType: 'transform',
          source: 'recipe_cook',
          idempotencyKey: leftoverIdempotencyKey,
          createdByUserAccountId: userId,
          metadata: {
            source_type: 'recipe_cook',
            recipe_id: recipeId,
            cook_session_id: cookSessionId,
            leftover_servings: leftoverServings,
            target_item_ids: [newLeftoverId],
            source_item_ids: [],
            idempotency_payload: leftoverComparisonPayload,
          },
        });

        leftoverId = newLeftoverId;
      }
    }
  });

  logger.info(
    { userId, deducted: deducted.length, addedToShopping: addedToShopping.length, leftoverId },
    'Pantry deduction complete',
  );
  return { deducted, addedToShopping, leftoverId };
}
