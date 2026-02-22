import { UserModel, EventModel } from '@pricy/shared/db';
import { logger } from '../lib/logger.js';

export default function defineWeeklyDigest(agenda) {
  agenda.define('weekly-digest', { concurrency: 1 }, async (job) => {
    logger.info('Starting weekly digest');

    const users = await UserModel.find({
      weeklyDigest: true,
      isActive: true,
    });

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    let sent = 0;
    for (const user of users) {
      const events = await EventModel.find({
        userId: user._id,
        createdAt: { $gte: startDate, $lte: endDate }
      }).sort({ createdAt: -1 }).limit(50).lean();

      if (events.length === 0) {
        logger.debug({ userId: user._id }, 'No events — skipping digest');
        continue;
      }

      await agenda.now('send-email', {
        type: 'weekly-digest',
        userId: user._id.toString(),
        events: events.map(e => ({
          title: e.title,
          message: e.message,
          type: e.type,
          severity: e.severity,
          createdAt: e.createdAt,
        })),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      sent++;
    }

    logger.info({ users: users.length, sent }, 'Weekly digest: emails queued');
  });
}
