import { UserModel, ProductModel, CompetitorModel } from '@pricy/shared/db';
import { logger } from '../lib/logger.js';

export default function defineDailyPriceCheck(agenda) {
  agenda.define('daily-price-check', { concurrency: 1 }, async (job) => {
    logger.info('Starting daily price check (free/starter)');

    const users = await UserModel.find({
      plan: { $in: ['free', 'starter'] },
      isActive: true
    }).select('_id');

    if (!users.length) {
      logger.info('No free/starter users found — skipping');
      return;
    }

    const userIds = users.map(u => u._id);

    const trackedProductIds = await ProductModel.find({
      userId: { $in: userIds },
      isTracked: true
    }).distinct('_id');

    const competitors = await CompetitorModel.find({
      isActive: true,
      productId: { $in: trackedProductIds }
    });

    logger.info({ users: userIds.length, products: trackedProductIds.length, competitors: competitors.length }, 'Daily check: found competitors');

    for (const competitor of competitors) {
      await agenda.now('check-competitor', {
        competitorId: competitor._id.toString(),
        userId: competitor.userId.toString(),
      });
    }

    logger.info({ queued: competitors.length }, 'Daily price check: all competitor jobs queued');
  });
}
