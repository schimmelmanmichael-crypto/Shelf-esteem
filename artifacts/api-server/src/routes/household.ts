import { Router } from 'express';
import { db, householdsTable, householdMembersTable, householdInvitesTable, usersTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import crypto from 'crypto';

const router: Router = Router();

router.get('/', requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
  if (!user?.householdId) { res.json(null); return; }

  const [household] = await db.select().from(householdsTable).where(eq(householdsTable.id, user.householdId)).limit(1);
  if (!household) { res.json(null); return; }

  const members = await db.select().from(householdMembersTable).where(eq(householdMembersTable.householdId, household.id));
  res.json(serialize({ ...household, members }));
  return;
});

router.post('/', requireAuth, async (req, res): Promise<void> => {
  const { name } = req.body as { name: string };
  const id = crypto.randomUUID();

  const [household] = await db.insert(householdsTable).values({ id, name, ownerId: req.userId }).returning();
  await db.insert(householdMembersTable).values({ id: crypto.randomUUID(), householdId: id, userId: req.userId, role: 'owner' });
  await db.update(usersTable).set({ householdId: id, updatedAt: new Date() }).where(eq(usersTable.id, req.userId));

  res.json(serialize(household));
  return;
});

router.post('/invite', requireAuth, async (req, res): Promise<void> => {
  const { email } = req.body as { email: string };
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
  if (!user?.householdId) { res.status(400).json({ error: 'Not in a household' }); return; }

  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(householdInvitesTable).values({
    id: crypto.randomUUID(),
    householdId: user.householdId,
    email,
    token,
    expiresAt,
  });

  const domain = process.env.RAILWAY_DOMAIN
    ? `https://${process.env.RAILWAY_DOMAIN}`
    : 'http://localhost:8082';

  res.json({ ok: true, inviteLink: `${domain}/sign-up?household=${token}` });
  return;
});

router.post('/join', requireAuth, async (req, res): Promise<void> => {
  const { token } = req.body as { token: string };
  const [invite] = await db.select().from(householdInvitesTable)
    .where(and(eq(householdInvitesTable.token, token), eq(householdInvitesTable.isAccepted, false)))
    .limit(1);

  if (!invite || (invite.expiresAt && invite.expiresAt < new Date())) {
    res.status(400).json({ error: 'Invalid or expired invite' });
    return;
  }

  await db.insert(householdMembersTable).values({
    id: crypto.randomUUID(),
    householdId: invite.householdId,
    userId: req.userId,
    role: 'member',
  }).onConflictDoNothing();

  await db.update(usersTable).set({ householdId: invite.householdId, updatedAt: new Date() }).where(eq(usersTable.id, req.userId));
  await db.update(householdInvitesTable).set({ isAccepted: true }).where(eq(householdInvitesTable.id, invite.id));

  res.json({ ok: true });
  return;
});

export default router;
