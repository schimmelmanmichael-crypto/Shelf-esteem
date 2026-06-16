import { Router } from 'express';
import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { getStripe } from '../stripeClient.js';
import { handleSubscriptionUpsert, handleSubscriptionDeleted } from '../webhookHandlers.js';
import { logger } from '../lib/logger.js';
import type { Request, Response } from 'express';
import Stripe from 'stripe';

const router: Router = Router();

const TESTER_CODES = (process.env.TESTER_CODES ?? 'SHIMMYPLAN,SHELFTESTER').split(',').map(c => c.trim());

router.get('/products', async (req, res): Promise<void> => {
  try {
    const stripe = getStripe();
    const products = await stripe.products.list({ active: true, expand: ['data.default_price'] });
    res.json(products.data);
  } catch {
    res.json([]);
  }
  return;
});

router.get('/status', requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
  if (!user) { res.status(404).json({ error: 'Not found' }); return; }

  const now = new Date();
  const trialActive = user.trialEndsAt ? user.trialEndsAt > now : false;

  res.json({
    plan: user.plan ?? 'free',
    trialActive,
    trialEndsAt: user.trialEndsAt,
    shelfScore:   user.shelfScore   ?? 0,
    savingsScore: user.savingsScore ?? 0,
    wasteScore:   user.wasteScore   ?? 0,
    shelfStreak:  user.shelfStreak  ?? 0,
  });
  return;
});

router.post('/create-checkout', requireAuth, async (req, res): Promise<void> => {
  const { priceId, annual = false } = req.body as { priceId: string; annual?: boolean };

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
  if (!user) { res.status(404).json({ error: 'Not found' }); return; }

  try {
    const stripe = getStripe();
    const domain = process.env.RAILWAY_DOMAIN
      ? `https://${process.env.RAILWAY_DOMAIN}`
      : 'http://localhost:8082';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.stripeCustomerId ? undefined : user.email,
      customer: user.stripeCustomerId ?? undefined,
      success_url: `${domain}/shopping/checkout-complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/pricing`,
      subscription_data: { trial_period_days: 14 },
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, 'Checkout creation failed');
    res.status(500).json({ error: 'Checkout failed' });
  }
  return;
});

router.post('/portal', requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
  if (!user?.stripeCustomerId) { res.status(400).json({ error: 'No billing account' }); return; }

  try {
    const stripe = getStripe();
    const domain = process.env.RAILWAY_DOMAIN
      ? `https://${process.env.RAILWAY_DOMAIN}`
      : 'http://localhost:8082';

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${domain}/account`,
    });
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, 'Portal creation failed');
    res.status(500).json({ error: 'Portal failed' });
  }
  return;
});

router.post('/redeem-tester-code', requireAuth, async (req, res): Promise<void> => {
  const { code } = req.body as { code: string };
  if (!TESTER_CODES.includes(code?.trim().toUpperCase())) {
    res.status(400).json({ error: 'Invalid code' });
    return;
  }

  await db.update(usersTable).set({ plan: 'plus', updatedAt: new Date() }).where(eq(usersTable.id, req.userId));
  res.json({ ok: true, plan: 'plus' });
  return;
});

// Stripe webhook — raw body required (wired in app.ts before json middleware)
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) {
    res.status(400).json({ error: 'Missing webhook config' });
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err) {
    logger.error({ err }, 'Webhook signature verification failed');
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'invoice.payment_succeeded':
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
    }
    res.json({ received: true });
  } catch (err) {
    logger.error({ err, type: event.type }, 'Webhook handler error');
    res.status(500).json({ error: 'Handler failed' });
  }
  return;
});

export default router;
