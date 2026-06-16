import { clerkMiddleware, getAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';
import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger.js';
import { sendEmail } from '../lib/email/resendClient.js';
import { welcomeEmail } from '../lib/email/emailTemplates.js';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      userId: string;
      userPlan: string;
    }
  }
}

const lastActiveThrottle = new Map<string, number>();

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId)).limit(1);

    if (!user) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

      const [newUser] = await db.insert(usersTable).values({
        id: crypto.randomUUID(),
        clerkId: auth.userId,
        email: (auth as unknown as { emailAddresses?: Array<{ emailAddress: string }> }).emailAddresses?.[0]?.emailAddress ?? '',
        plan: 'free',
        trialStartedAt: new Date(),
        trialEndsAt: trialEnd,
        referralCode,
      }).returning();

      user = newUser;

      const tmpl = welcomeEmail(user.displayName ?? user.email);
      sendEmail({ to: user.email, ...tmpl }).catch(() => {});
      logger.info({ userId: user.id }, 'New user provisioned');
    }

    req.userId = user.id;
    req.userPlan = user.plan ?? 'free';

    const now = Date.now();
    const last = lastActiveThrottle.get(user.id) ?? 0;
    if (now - last > 60 * 60 * 1000) {
      lastActiveThrottle.set(user.id, now);
      db.update(usersTable).set({ lastActiveAt: new Date() }).where(eq(usersTable.id, user.id)).catch(() => {});
    }

    next();
  } catch (err) {
    logger.error({ err }, 'requireAuth error');
    res.status(500).json({ error: 'Auth error' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.userId !== process.env.ADMIN_USER_ID) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}
