import { CompetitorModel, ProductModel, PriceHistoryModel, EventModel } from '@pricy/shared/db';
import { calculatePriceChange } from '@pricy/shared';
import { PriceScraperService } from '../services/PriceScraperService.js';
import { RuleEngineService } from '../services/RuleEngineService.js';
import { logger } from '../lib/logger.js';

const scraper = new PriceScraperService();

export default function defineCheckCompetitor(agenda) {
  const ruleEngine = new RuleEngineService(agenda);

  agenda.define('check-competitor', { concurrency: 5 }, async (job) => {
    const { competitorId } = job.attrs.data;

    const competitor = await CompetitorModel.findById(competitorId);
    if (!competitor) {
      logger.warn({ competitorId }, 'Competitor not found — skipping');
      return;
    }

    const product = await ProductModel.findById(competitor.productId);
    if (!product) {
      logger.warn({ competitorId, productId: competitor.productId }, 'Product not found — skipping');
      return;
    }

    logger.info({ competitor: competitor.name, url: competitor.url }, 'Checking competitor');

    const result = await scraper.scrapePrice(competitor.url, competitor.selectors);

    if (result.success) {
      const previousPrice = competitor.currentPrice;
      const newPrice = result.price;

      competitor.currentPrice = newPrice;
      competitor.currency = result.currency || competitor.currency;
      competitor.lastCheckedAt = new Date();
      competitor.checkStatus = 'success';
      competitor.errorMessage = null;

      if (!competitor.canonicalUrl && result.canonicalUrl) {
        competitor.canonicalUrl = result.canonicalUrl;
      }
      if (!competitor.imageUrl && result.imageUrl) {
        competitor.imageUrl = result.imageUrl;
      }

      const priceData = calculatePriceChange(newPrice, previousPrice);

      await PriceHistoryModel.create({
        competitorId: competitor._id,
        productId: competitor.productId,
        userId: competitor.userId,
        price: newPrice,
        previousPrice: previousPrice || null,
        currency: competitor.currency,
        priceChange: priceData?.change || null,
        priceChangePercent: priceData?.changePercent || null,
        source: 'scraper'
      });

      if (previousPrice == null) {
        competitor.lastPriceChange = new Date();
        await EventModel.create({
          userId: competitor.userId,
          productId: competitor.productId,
          competitorId: competitor._id,
          type: 'price_discovered',
          severity: 'info',
          title: `${competitor.name} price discovered`,
          message: `Found price ${newPrice} ${competitor.currency} for ${product.title}`,
          data: { competitorName: competitor.name, productTitle: product.title, price: newPrice, currency: competitor.currency }
        });
        logger.info({ competitor: competitor.name, price: newPrice }, 'Price discovered');
      } else if (previousPrice !== newPrice) {
        competitor.lastPriceChange = new Date();
        const isDecrease = newPrice < previousPrice;
        const severity = Math.abs(priceData?.changePercent || 0) > 10 ? 'alert' :
                         Math.abs(priceData?.changePercent || 0) > 5 ? 'warning' : 'info';

        await EventModel.create({
          userId: competitor.userId,
          productId: competitor.productId,
          competitorId: competitor._id,
          type: isDecrease ? 'price_drop' : 'price_increase',
          severity,
          title: `${competitor.name} ${isDecrease ? 'dropped' : 'increased'} price`,
          message: `Price changed from ${previousPrice} to ${newPrice} (${priceData?.changePercent?.toFixed(2) || 0}%)`,
          data: { competitorName: competitor.name, productTitle: product.title, newPrice, previousPrice, priceChange: priceData?.change, priceChangePercent: priceData?.changePercent }
        });

        await ruleEngine.evaluatePriceChange(competitor, product, newPrice, previousPrice);
        logger.info({ competitor: competitor.name, from: previousPrice, to: newPrice }, 'Price changed');
      } else {
        logger.debug({ competitor: competitor.name, price: newPrice }, 'Price unchanged');
      }

      await competitor.save();
    } else {
      competitor.lastCheckedAt = new Date();
      competitor.checkStatus = 'error';
      competitor.errorMessage = result.error;
      await competitor.save();

      await EventModel.create({
        userId: competitor.userId,
        productId: competitor.productId,
        competitorId: competitor._id,
        type: 'competitor_error',
        severity: 'warning',
        title: `Failed to check ${competitor.name}`,
        message: result.error,
        data: { competitorName: competitor.name, url: competitor.url, error: result.error }
      });

      logger.warn({ competitor: competitor.name, error: result.error }, 'Scrape failed');
      throw new Error(result.error); // Triggers Agenda retry
    }
  });
}
