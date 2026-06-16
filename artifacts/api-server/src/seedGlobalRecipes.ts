import { db, recipesTable, recipeIngredientsTable } from '@workspace/db';
import { isNull } from 'drizzle-orm';
import { logger } from './lib/logger.js';
import crypto from 'crypto';

const GLOBAL_RECIPES = [
  {
    name: 'Classic Spaghetti Bolognese',
    description: 'A hearty meat sauce over pasta — a weeknight staple.',
    category: 'Dinner',
    servings: 4,
    prepTime: 15,
    cookTime: 30,
    instructions: '1. Brown ground beef in a large pan.\n2. Add onion, garlic, cook 3 min.\n3. Add tomato sauce, Italian seasoning, simmer 20 min.\n4. Serve over cooked spaghetti.',
    tips: 'Add a splash of red wine for depth.',
    ingredients: [
      { name: 'spaghetti', quantity: 400, unit: 'g' },
      { name: 'ground beef', quantity: 500, unit: 'g' },
      { name: 'onion', quantity: 1, unit: 'each' },
      { name: 'garlic', quantity: 3, unit: 'each' },
      { name: 'tomato sauce', quantity: 400, unit: 'g' },
    ],
  },
  {
    name: 'Chicken Stir-Fry',
    description: 'Quick and colorful — on the table in 20 minutes.',
    category: 'Dinner',
    servings: 2,
    prepTime: 10,
    cookTime: 10,
    instructions: '1. Slice chicken into strips.\n2. Heat oil in wok over high heat.\n3. Add chicken, cook 5 min.\n4. Add vegetables and soy sauce, toss 3 min.\n5. Serve over rice.',
    tips: 'Use any vegetables you have on hand.',
    ingredients: [
      { name: 'chicken breast', quantity: 300, unit: 'g' },
      { name: 'bell pepper', quantity: 1, unit: 'each' },
      { name: 'broccoli', quantity: 200, unit: 'g' },
      { name: 'soy sauce', quantity: 3, unit: 'tbsp' },
      { name: 'rice', quantity: 1, unit: 'cup' },
    ],
  },
  {
    name: 'Vegetable Fried Rice',
    description: 'Perfect for leftover rice — a complete meal in one pan.',
    category: 'Dinner',
    servings: 3,
    prepTime: 5,
    cookTime: 15,
    instructions: '1. Scramble eggs in a hot pan, set aside.\n2. Add oil and vegetables, stir-fry 3 min.\n3. Add cold cooked rice, fry 5 min.\n4. Add soy sauce and eggs, toss to combine.',
    tips: 'Day-old cold rice is best — freshly cooked gets mushy.',
    ingredients: [
      { name: 'cooked rice', quantity: 3, unit: 'cup' },
      { name: 'eggs', quantity: 2, unit: 'each' },
      { name: 'frozen peas', quantity: 1, unit: 'cup' },
      { name: 'carrots', quantity: 2, unit: 'each' },
      { name: 'soy sauce', quantity: 2, unit: 'tbsp' },
    ],
  },
  {
    name: 'Banana Oat Pancakes',
    description: 'Naturally sweet and filling — just four ingredients.',
    category: 'Breakfast',
    servings: 2,
    prepTime: 5,
    cookTime: 10,
    instructions: '1. Mash 2 bananas in a bowl.\n2. Add 1 cup oats and 2 eggs, mix.\n3. Cook spoonfuls on a non-stick pan over medium heat, 2 min per side.',
    tips: 'Top with peanut butter and sliced banana.',
    ingredients: [
      { name: 'banana', quantity: 2, unit: 'each' },
      { name: 'oats', quantity: 1, unit: 'cup' },
      { name: 'eggs', quantity: 2, unit: 'each' },
    ],
  },
  {
    name: 'Black Bean Tacos',
    description: 'Budget-friendly, protein-packed, and ready in 10 minutes.',
    category: 'Dinner',
    servings: 4,
    prepTime: 5,
    cookTime: 8,
    instructions: '1. Drain and rinse black beans.\n2. Heat in a pan with cumin, chili powder, salt.\n3. Warm tortillas.\n4. Fill with beans, salsa, shredded cheese, and lime juice.',
    tips: 'Add avocado if you have it.',
    ingredients: [
      { name: 'black beans', quantity: 400, unit: 'g' },
      { name: 'tortillas', quantity: 8, unit: 'each' },
      { name: 'salsa', quantity: 0.5, unit: 'cup' },
      { name: 'cumin', quantity: 1, unit: 'tsp' },
      { name: 'shredded cheese', quantity: 0.5, unit: 'cup' },
    ],
  },
];

export async function seedGlobalRecipes(): Promise<void> {
  const existing = await db.select().from(recipesTable).where(isNull(recipesTable.userId));
  if (existing.length > 0) {
    logger.info({ count: existing.length }, 'Global recipes already seeded — skipping');
    return;
  }

  const key = process.env.RECIPE_SEED_KEY ?? 'shelf-esteem-seed-2026';
  if (!key) return;

  for (const r of GLOBAL_RECIPES) {
    const recipeId = crypto.randomUUID();
    await db.insert(recipesTable).values({
      id: recipeId,
      userId: null,
      name: r.name,
      description: r.description,
      category: r.category,
      servings: r.servings,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      instructions: r.instructions,
      tips: r.tips,
    });

    await db.insert(recipeIngredientsTable).values(
      r.ingredients.map((ing, i) => ({
        id: crypto.randomUUID(),
        recipeId,
        name: ing.name,
        quantity: ing.quantity.toString(),
        unit: ing.unit,
        sortOrder: i,
      }))
    );
  }

  logger.info({ count: GLOBAL_RECIPES.length }, 'Global recipes seeded');
}
