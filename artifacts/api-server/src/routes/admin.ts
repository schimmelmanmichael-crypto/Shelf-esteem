import { Router } from 'express';
import { db, usersTable } from '@workspace/db';
import { requireAuth, requireAdmin } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';

const router: Router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/users', async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  res.json(serialize(users));
  return;
});

router.get('/stats', async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  const plans: Record<string, number> = {};
  for (const u of users) {
    const p = u.plan ?? 'free';
    plans[p] = (plans[p] ?? 0) + 1;
  }
  res.json({ totalUsers: users.length, byPlan: plans });
  return;
});

export default router;
