export type Plan = 'free' | 'pro' | 'plus' | 'family' | 'restaurant';

export interface PlanLimits {
  pantryItems: number;
  recipes: number;
  shoppingItems: number;
  mealPlanDays: number;
  householdMembers: number;
  receiptsPerMonth: number;
  weeklyAdsPerMonth: number;
  aiFeatures: boolean;
  exportData: boolean;
  priceAlerts: number;
}

const LIMITS: Record<Plan, PlanLimits> = {
  free: {
    pantryItems: 50,
    recipes: 10,
    shoppingItems: 30,
    mealPlanDays: 7,
    householdMembers: 1,
    receiptsPerMonth: 3,
    weeklyAdsPerMonth: 1,
    aiFeatures: false,
    exportData: false,
    priceAlerts: 3,
  },
  pro: {
    pantryItems: 200,
    recipes: 50,
    shoppingItems: 100,
    mealPlanDays: 30,
    householdMembers: 2,
    receiptsPerMonth: 20,
    weeklyAdsPerMonth: 8,
    aiFeatures: true,
    exportData: true,
    priceAlerts: 20,
  },
  plus: {
    pantryItems: 500,
    recipes: 200,
    shoppingItems: 300,
    mealPlanDays: 90,
    householdMembers: 4,
    receiptsPerMonth: 50,
    weeklyAdsPerMonth: 20,
    aiFeatures: true,
    exportData: true,
    priceAlerts: 50,
  },
  family: {
    pantryItems: 1000,
    recipes: 500,
    shoppingItems: 500,
    mealPlanDays: 180,
    householdMembers: 8,
    receiptsPerMonth: 100,
    weeklyAdsPerMonth: 40,
    aiFeatures: true,
    exportData: true,
    priceAlerts: 100,
  },
  restaurant: {
    pantryItems: Infinity,
    recipes: Infinity,
    shoppingItems: Infinity,
    mealPlanDays: Infinity,
    householdMembers: Infinity,
    receiptsPerMonth: Infinity,
    weeklyAdsPerMonth: Infinity,
    aiFeatures: true,
    exportData: true,
    priceAlerts: Infinity,
  },
};

export function getLimits(plan: string): PlanLimits {
  return LIMITS[(plan as Plan) ?? 'free'] ?? LIMITS.free;
}

const TESTER_CODES = (process.env.TESTER_CODES ?? '').split(',').map(c => c.trim());

export function isTesterCode(code: string): boolean {
  return TESTER_CODES.includes(code.toUpperCase());
}
