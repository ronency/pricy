import { ProductModel, CompetitorModel } from '@pricy/shared/db';
import { logger } from '../lib/logger.js';

export default function definePriceCheck(agenda) {
  agenda.define('price-check', { concurrency: 1 }, async (job) => {
    logger.info('Starting hourly price check');

    const trackedProductIds = await ProductModel.find({ isTracked: true }).distinct('_id');

    const competitors = await CompetitorModel.find({
      isActive: true,
      productId: { $in: trackedProductIds }
    });

    logger.info({ count: competitors.length, products: trackedProductIds.length }, 'Found competitors to check');

    for (const competitor of competitors) {
      await agenda.now('check-competitor', {
        competitorId: competitor._id.toString(),
        userId: competitor.userId.toString(),
      });
    }

    logger.info({ queued: competitors.length }, 'Price check: all competitor jobs queued');
  });
}
