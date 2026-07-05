import { Router } from 'express';
import { db, receiptCodeMapTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import crypto from 'crypto';
import { z } from 'zod';

// Whitelist for PATCH /:id — only these fields are client-editable. Without
// this, {...req.body} spread into .set() unchecked could overwrite id/userId/
// householdId on the caller's own row.
const receiptCodeMapPatchSchema = z.object({
  receiptCode: z.string().optional(),
  itemName:    z.string().optional(),
  category:    z.string().optional(),
  brand:       z.string().optional(),
});

const router: Router = Router();

router.get('/', requireAuth, async (req, res): Promise<void> => {
  const entries = await db.select().from(receiptCodeMapTable).where(eq(receiptCodeMapTable.userId, req.userId));
  res.json(serialize(entries));
  return;
});

router.post('/', requireAuth, async (req, res): Promise<void> => {
  const [entry] = await db.insert(receiptCodeMapTable).values({
    id: crypto.randomUUID(),
    userId: req.userId,
    ...req.body,
  }).returning();
  res.json(serialize(entry));
  return;
});

router.patch('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;

  const parsed = receiptCodeMapPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors });
    return;
  }

  const [updated] = await db
    .update(receiptCodeMapTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(receiptCodeMapTable.id, id), eq(receiptCodeMapTable.userId, req.userId)))
    .returning();
  res.json(serialize(updated));
  return;
});

router.delete('/:id', requireAuth, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  await db.delete(receiptCodeMapTable).where(
    and(eq(receiptCodeMapTable.id, id), eq(receiptCodeMapTable.userId, req.userId))
  );
  res.json({ ok: true });
  return;
});

router.get('/lookup/:code', requireAuth, async (req, res): Promise<void> => {
  const code = req.params['code'] as string;
  const [entry] = await db.select().from(receiptCodeMapTable)
    .where(and(eq(receiptCodeMapTable.userId, req.userId), eq(receiptCodeMapTable.receiptCode, code)))
    .limit(1);
  res.json(entry ?? null);
  return;
});

export default router;
