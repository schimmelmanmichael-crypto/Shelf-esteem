import { Router } from 'express';
import {
  db,
  communityRecipesTable,
  communityCommentsTable,
  saleAlertsTable,
  pantrySharesTable,
  cookingChallengesTable,
  challengeSubmissionsTable,
  challengeVotesTable,
  gadgetPostsTable,
  groupEventsTable,
  qaPostsTable,
} from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { serialize } from '../lib/serialize.js';
import crypto from 'crypto';

const router: Router = Router();

// Community routes are open — no requireAuth. Intentional per spec.

// ── Recipes ──────────────────────────────────────────────────────────────────

router.get('/recipes', async (req, res): Promise<void> => {
  const recipes = await db.select().from(communityRecipesTable).where(eq(communityRecipesTable.isApproved, true));
  res.json(serialize(recipes));
  return;
});

router.get('/recipes/:id', async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [recipe] = await db.select().from(communityRecipesTable)
    .where(eq(communityRecipesTable.id, id)).limit(1);
  if (!recipe) { res.status(404).json({ error: 'Not found' }); return; }

  const comments = await db.select().from(communityCommentsTable)
    .where(and(eq(communityCommentsTable.postId, recipe.id), eq(communityCommentsTable.postType, 'recipe')));
  res.json(serialize({ ...recipe, comments }));
  return;
});

router.post('/recipes', async (req, res): Promise<void> => {
  const [recipe] = await db.insert(communityRecipesTable).values({
    id: crypto.randomUUID(),
    ...req.body,
    isApproved: true,
  }).returning();
  res.json(serialize(recipe));
  return;
});

router.post('/recipes/:id/like', async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [recipe] = await db.select().from(communityRecipesTable)
    .where(eq(communityRecipesTable.id, id)).limit(1);
  if (!recipe) { res.status(404).json({ error: 'Not found' }); return; }

  await db.update(communityRecipesTable)
    .set({ likeCount: (recipe.likeCount ?? 0) + 1 })
    .where(eq(communityRecipesTable.id, recipe.id));
  res.json({ ok: true });
  return;
});

router.post('/recipes/:id/comments', async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [comment] = await db.insert(communityCommentsTable).values({
    id: crypto.randomUUID(),
    postId: id,
    postType: 'recipe',
    ...req.body,
  }).returning();

  const allComments = await db.select().from(communityCommentsTable).where(eq(communityCommentsTable.postId, id));
  await db.update(communityRecipesTable)
    .set({ commentCount: allComments.length })
    .where(eq(communityRecipesTable.id, id));

  res.json(serialize(comment));
  return;
});

// ── Sale Alerts ───────────────────────────────────────────────────────────────

router.get('/sale-alerts', async (req, res): Promise<void> => {
  const { zip } = req.query as { zip?: string };
  let alerts = await db.select().from(saleAlertsTable);
  if (zip) alerts = alerts.filter(a => a.zipCode === zip);
  res.json(serialize(alerts));
  return;
});

router.post('/sale-alerts', async (req, res): Promise<void> => {
  const [alert] = await db.insert(saleAlertsTable).values({
    id: crypto.randomUUID(),
    ...req.body,
  }).returning();
  res.json(serialize(alert));
  return;
});

// ── Pantry Shares ─────────────────────────────────────────────────────────────

router.get('/pantry-shares', async (req, res): Promise<void> => {
  const shares = await db.select().from(pantrySharesTable).where(eq(pantrySharesTable.isAvailable, true));
  res.json(serialize(shares));
  return;
});

router.post('/pantry-shares', async (req, res): Promise<void> => {
  const [share] = await db.insert(pantrySharesTable).values({
    id: crypto.randomUUID(),
    ...req.body,
  }).returning();
  res.json(serialize(share));
  return;
});

// ── Challenges ────────────────────────────────────────────────────────────────

router.get('/challenges', async (req, res): Promise<void> => {
  const challenges = await db.select().from(cookingChallengesTable).where(eq(cookingChallengesTable.isActive, true));
  res.json(serialize(challenges));
  return;
});

router.get('/challenges/:id/submissions', async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const subs = await db.select().from(challengeSubmissionsTable)
    .where(eq(challengeSubmissionsTable.challengeId, id));
  res.json(serialize(subs));
  return;
});

router.post('/challenges/:id/submissions', async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [sub] = await db.insert(challengeSubmissionsTable).values({
    id: crypto.randomUUID(),
    challengeId: id,
    ...req.body,
  }).returning();
  res.json(serialize(sub));
  return;
});

router.post('/challenges/submissions/:id/vote', async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [sub] = await db.select().from(challengeSubmissionsTable)
    .where(eq(challengeSubmissionsTable.id, id)).limit(1);
  if (!sub) { res.status(404).json({ error: 'Not found' }); return; }

  await db.insert(challengeVotesTable).values({
    id: crypto.randomUUID(),
    submissionId: id,
    ipAddress: req.ip,
  }).onConflictDoNothing();

  await db.update(challengeSubmissionsTable)
    .set({ voteCount: (sub.voteCount ?? 0) + 1 })
    .where(eq(challengeSubmissionsTable.id, sub.id));

  res.json({ ok: true });
  return;
});

// ── Gadgets ───────────────────────────────────────────────────────────────────

router.get('/gadgets', async (req, res): Promise<void> => {
  const posts = await db.select().from(gadgetPostsTable);
  res.json(serialize(posts));
  return;
});

router.post('/gadgets', async (req, res): Promise<void> => {
  const [post] = await db.insert(gadgetPostsTable).values({
    id: crypto.randomUUID(),
    ...req.body,
  }).returning();
  res.json(serialize(post));
  return;
});

// ── Groups ────────────────────────────────────────────────────────────────────

router.get('/groups', async (req, res): Promise<void> => {
  const events = await db.select().from(groupEventsTable).where(eq(groupEventsTable.isOpen, true));
  res.json(serialize(events));
  return;
});

router.post('/groups', async (req, res): Promise<void> => {
  const [event] = await db.insert(groupEventsTable).values({
    id: crypto.randomUUID(),
    ...req.body,
  }).returning();
  res.json(serialize(event));
  return;
});

// ── Q&A ───────────────────────────────────────────────────────────────────────

router.get('/qa', async (req, res): Promise<void> => {
  const posts = await db.select().from(qaPostsTable);
  res.json(serialize(posts));
  return;
});

router.get('/qa/:id', async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [post] = await db.select().from(qaPostsTable)
    .where(eq(qaPostsTable.id, id)).limit(1);
  if (!post) { res.status(404).json({ error: 'Not found' }); return; }

  const replies = await db.select().from(communityCommentsTable)
    .where(and(eq(communityCommentsTable.postId, post.id), eq(communityCommentsTable.postType, 'qa')));
  res.json(serialize({ ...post, replies }));
  return;
});

router.post('/qa', async (req, res): Promise<void> => {
  const [post] = await db.insert(qaPostsTable).values({
    id: crypto.randomUUID(),
    ...req.body,
  }).returning();
  res.json(serialize(post));
  return;
});

router.post('/qa/:id/replies', async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  const [reply] = await db.insert(communityCommentsTable).values({
    id: crypto.randomUUID(),
    postId: id,
    postType: 'qa',
    ...req.body,
  }).returning();
  res.json(serialize(reply));
  return;
});

router.patch('/qa/:id/resolve', async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  await db.update(qaPostsTable).set({ isResolved: true, updatedAt: new Date() }).where(eq(qaPostsTable.id, id));
  res.json({ ok: true });
  return;
});

export default router;
