import { Router } from 'express';
import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { activateDemo, restoreFromDemo } from '../lib/demo.js';
import { IdempotencyConflictError, isUniqueConstraintViolation } from '../lib/idempotency.js';
import { logger } from '../lib/logger.js';

const DEMO_SEED_CODE = process.env.DEMO_SEED_CODE ?? 'PANTRYDEMO';

const router: Router = Router();

router.post('/activate', requireAuth, async (req, res): Promise<void> => {
  const { code } = req.body as { code?: string };
  if (code?.trim().toUpperCase() !== DEMO_SEED_CODE) {
    res.status(400).json({ error: 'Invalid demo code' });
    return;
  }

  try {
    await activateDemo(req.userId);
    await db.update(usersTable).set({ isDemoActive: true, updatedAt: new Date() }).where(eq(usersTable.id, req.userId));
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof IdempotencyConflictError) {
      res.status(409).json({ error: 'Idempotency conflict', message: err.message });
      return;
    }
    if (isUniqueConstraintViolation(err)) {
      res.status(409).json({ error: 'Concurrent duplicate request', message: 'Demo activation is already being processed' });
      return;
    }
    logger.error({ err }, 'Demo activate error');
    res.status(500).json({ error: 'Failed to activate demo' });
  }
  return;
});

router.post('/restore', requireAuth, async (req, res): Promise<void> => {
  try {
    await restoreFromDemo(req.userId);
    await db.update(usersTable).set({ isDemoActive: false, updatedAt: new Date() }).where(eq(usersTable.id, req.userId));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Demo restore error');
    res.status(500).json({ error: 'Failed to restore' });
  }
  return;
});

export default router;
