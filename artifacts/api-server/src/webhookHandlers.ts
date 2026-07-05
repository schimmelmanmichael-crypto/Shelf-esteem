import type Stripe from 'stripe';
import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { logger } from './lib/logger.js';
import { getStripe } from './stripeClient.js';

function planFromProductName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('restaurant')) return 'restaurant';
  if (lower.includes('family'))     return 'family';
  if (lower.includes('plus'))       return 'plus';
  if (lower.includes('pro'))        return 'pro';
  return 'free';
}

export async function handleSubscriptionUpsert(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.stripeCustomerId, customerId)).limit(1);
  if (!user) return;

  const item = sub.items.data[0];
  const product = item?.price?.product;
  let productName = '';
  if (typeof product === 'object') {
    productName = (product as Stripe.Product).name;
  } else if (typeof product === 'string') {
    // Not pre-expanded (webhook payloads never are, and subscriptions.list
    // can't expand this deep — Stripe hard-limits expand to 4 levels, and
    // data.items.data.price.product is 5) — fetch it directly instead.
    const fetched = await getStripe().products.retrieve(product);
    productName = fetched.name;
  }
  const plan = sub.status === 'active' || sub.status === 'trialing' ? planFromProductName(productName) : 'free';

  await db.update(usersTable)
    .set({ plan, stripeSubscriptionId: sub.id, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  logger.info({ userId: user.id, plan }, 'Subscription synced');
}

export async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.stripeCustomerId, customerId)).limit(1);
  if (!user) return;

  await db.update(usersTable)
    .set({ plan: 'free', stripeSubscriptionId: null, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  logger.info({ userId: user.id }, 'Subscription deleted — reverted to free');
}

export async function syncBackfill(stripe: import('stripe').default): Promise<void> {
  logger.info('Stripe backfill starting');
  const subs = await stripe.subscriptions.list({ status: 'all', limit: 100, expand: ['data.items.data.price'] });
  for (const sub of subs.data) {
    if (sub.status === 'active' || sub.status === 'trialing') {
      await handleSubscriptionUpsert(sub).catch(err => logger.error({ err }, 'Backfill item error'));
    }
  }
  logger.info({ count: subs.data.length }, 'Stripe backfill complete');
}
