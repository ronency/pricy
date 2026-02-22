import 'dotenv/config';
import { connectDatabase } from '@pricy/shared/db';
import { createAgenda, retryConfig } from './config/agenda.js';
import { registerAllJobs } from './jobs/index.js';
import { startHealthCheck } from './lib/healthCheck.js';
import { registerGracefulShutdown } from './lib/gracefulShutdown.js';
import { logger } from './lib/logger.js';

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pricy';

  // 1. Connect to MongoDB
  await connectDatabase();
  logger.info('MongoDB connected');

  // 2. Create Agenda instance
  const agenda = createAgenda(mongoUri);

  // 3. Register all job definitions
  registerAllJobs(agenda);

  // 4. Set up event listeners
  agenda.on('start', (job) => {
    logger.debug({ job: job.attrs.name }, 'Job started');
  });

  agenda.on('complete', (job) => {
    logger.debug({ job: job.attrs.name }, 'Job completed');
  });

  agenda.on('fail', (err, job) => {
    const name = job.attrs.name;
    const config = retryConfig[name];
    const failCount = job.attrs.failCount || 1;

    logger.error({ job: name, failCount, err: err.message }, 'Job failed');

    if (!config || failCount > config.maxRetries) return;

    const delay = config.backoff === 'exponential'
      ? config.delay * Math.pow(2, failCount - 1)
      : config.delay;

    job.attrs.nextRunAt = new Date(Date.now() + delay);
    job.save();
    logger.info({ job: name, retryIn: `${delay / 1000}s`, attempt: failCount }, 'Scheduling retry');
  });

  // 5. Start Agenda
  await agenda.start();
  logger.info('Agenda started');

  // 6. Schedule recurring jobs (idempotent — won't duplicate)
  await agenda.every('1 hour', 'hourly-price-check');
  await agenda.every('0 4 * * *', 'daily-price-check');
  await agenda.every('0 3 * * *', 'stripe-reconciliation');
  await agenda.every('0 9 * * 1', 'weekly-digest'); // Monday 9 AM UTC

  logger.info('Recurring jobs scheduled');

  // 7. Start health check HTTP server
  const healthPort = parseInt(process.env.HEALTH_PORT || '7003', 10);
  const healthServer = startHealthCheck(healthPort);

  // 8. Register graceful shutdown handlers
  registerGracefulShutdown(agenda, healthServer);

  logger.info('Worker is running');
}

main().catch((err) => {
  logger.fatal({ err }, 'Worker failed to start');
  process.exit(1);
});
