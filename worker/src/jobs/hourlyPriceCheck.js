import { UserModel, ProductModel, CompetitorModel } from '@pricy/shared/db';
import { logger } from '../lib/logger.js';

export default function defineHourlyPriceCheck(agenda) {
  agenda.define('hourly-price-check', { concurrency: 1 }, async (job) => {
    logger.info('Starting hourly price check (pro/advanced)');

    const users = await UserModel.find({
      plan: { $in: ['pro', 'advanced'] },
      isActive: true
    }).select('_id');

    if (!users.length) {
      logger.info('No pro/advanced users found — skipping');
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

    logger.info({ users: userIds.length, products: trackedProductIds.length, competitors: competitors.length }, 'Hourly check: found competitors');

    for (const competitor of competitors) {
      await agenda.now('check-competitor', {
        competitorId: competitor._id.toString(),
        userId: competitor.userId.toString(),
      });
    }

    logger.info({ queued: competitors.length }, 'Hourly price check: all competitor jobs queued');
  });
}
