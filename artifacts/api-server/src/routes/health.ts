import { Router } from 'express';

const router: Router = Router();

router.get('/', async (_req, res): Promise<void> => {
  res.json({ ok: true, ts: new Date().toISOString() });
  return;
});

export default router;
