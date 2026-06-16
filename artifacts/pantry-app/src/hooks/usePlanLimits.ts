import { useQuery } from '@tanstack/react-query';

interface BillingStatus {
  plan: string;
  trialActive: boolean;
  trialEndsAt: string | null;
  shelfScore: number;
  savingsScore: number;
  wasteScore: number;
  shelfStreak: number;
}

// TEST_MODE: all limits are Infinity — GatedFeature never blocks
const TEST_MODE = true;

const INFINITY_LIMITS = {
  pantryItems: Infinity,
  recipes: Infinity,
  mealPlanDays: Infinity,
  shoppingItems: Infinity,
  receipts: Infinity,
  weeklyAds: Infinity,
  households: Infinity,
};

export function usePlanLimits() {
  const { data: status } = useQuery<BillingStatus>({
    queryKey: ['billing-status'],
    queryFn: () => fetch('/api/billing/status').then(r => r.json()),
    staleTime: 60_000,
  });

  return {
    plan: status?.plan ?? 'free',
    limits: TEST_MODE ? INFINITY_LIMITS : INFINITY_LIMITS,
    scores: {
      shelfScore:   status?.shelfScore   ?? 0,
      savingsScore: status?.savingsScore ?? 0,
      wasteScore:   status?.wasteScore   ?? 0,
      shelfStreak:  status?.shelfStreak  ?? 0,
    },
    trialActive: status?.trialActive ?? false,
    trialEndsAt: status?.trialEndsAt ?? null,
  };
}
