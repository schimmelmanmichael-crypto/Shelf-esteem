import { Router } from 'express';
import { db, usersTable, referralsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import crypto from 'crypto';

const router: Router = Router();

router.get('/my-code', requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
  if (!user) { res.status(404).json({ error: 'Not found' }); return; }

  const referrals = await db.select().from(referralsTable).where(eq(referralsTable.referrerId, req.userId));
  const successful = referrals.filter(r => r.status === 'completed').length;

  const domain = process.env.RAILWAY_DOMAIN
    ? `https://${process.env.RAILWAY_DOMAIN}`
    : 'http://localhost:8082';

  res.json({
    code: user.referralCode,
    link: `${domain}/sign-up?ref=${user.referralCode}`,
    referralCount: referrals.length,
    successfulReferrals: successful,
  });
  return;
});

router.post('/redeem', requireAuth, async (req, res): Promise<void> => {
  const { code } = req.body as { code: string };
  const [referrer] = await db.select().from(usersTable)
    .where(eq(usersTable.referralCode, code?.trim().toUpperCase()))
    .limit(1);

  if (!referrer || referrer.id === req.userId) {
    res.status(400).json({ error: 'Invalid referral code' });
    return;
  }

  await db.insert(referralsTable).values({
    id: crypto.randomUUID(),
    referrerId: referrer.id,
    referredUserId: req.userId,
    referralCode: code,
    status: 'completed',
    rewardGrantedAt: new Date(),
  }).onConflictDoNothing();

  await db.update(usersTable).set({ referredBy: referrer.id, updatedAt: new Date() }).where(eq(usersTable.id, req.userId));

  res.json({ ok: true });
  return;
});

export default router;
