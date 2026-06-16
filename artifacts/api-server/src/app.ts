import express from 'express';
import { clerkMiddleware } from '@clerk/express';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger.js';
import { clerkProxyMiddleware } from './middlewares/clerkProxyMiddleware.js';
import routes from './routes/index.js';

export const CLERK_PROXY_PATH = '/api/__clerk';

export function createApp(): express.Application {
  const app = express();

  // Stripe webhook needs raw body — mount before json parser
  app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use((pinoHttp as any)({ logger }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Clerk same-origin proxy
  app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

  // Clerk middleware (verifies JWTs on all requests)
  app.use(clerkMiddleware());

  // API routes
  app.use('/api', routes);

  // Global error handler
  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
