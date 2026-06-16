import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-05-27.dahlia' as '2026-05-27.dahlia',
    });
  }
  return stripeInstance;
}

export const PLAN_PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  pro:        { monthly: 'price_pro_monthly',        annual: 'price_pro_annual' },
  plus:       { monthly: 'price_plus_monthly',       annual: 'price_plus_annual' },
  family:     { monthly: 'price_family_monthly',     annual: 'price_family_annual' },
  restaurant: { monthly: 'price_restaurant_monthly', annual: 'price_restaurant_annual' },
};
