import { logger } from './logger.js';

export function registerGracefulShutdown(agenda, healthServer) {
  async function shutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully`);

    try {
      await agenda.stop();
      logger.info('Agenda stopped');
    } catch (err) {
      logger.error({ err }, 'Error stopping Agenda');
    }

    if (healthServer) {
      healthServer.close();
    }

    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
