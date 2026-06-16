import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { startEmailCron } from './lib/email/emailCron.js';
import { startLeftoverCron } from './lib/email/leftoverCron.js';
import { seedGlobalRecipes } from './seedGlobalRecipes.js';
import { getStripe } from './stripeClient.js';
import { syncBackfill } from './webhookHandlers.js';

const PORT = Number(process.env.PORT ?? 8080);

async function main() {
  const app = createApp();

  // On-startup tasks
  await seedGlobalRecipes().catch(err => logger.error({ err }, 'Recipe seed error'));

  const stripe = getStripe();
  syncBackfill(stripe).catch(err => logger.error({ err }, 'Stripe backfill error'));

  // Background crons
  startEmailCron();
  startLeftoverCron();

  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Shelf Esteem API running');
  });
}

main().catch(err => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
