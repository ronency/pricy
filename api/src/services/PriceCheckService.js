import { CompetitorModel } from '../config/competitorSchema.js';
import { ProductModel } from '../config/productSchema.js';
import { PriceHistoryModel } from '../config/priceHistorySchema.js';
import { EventModel } from '../config/eventSchema.js';
import { PriceScraperService } from './PriceScraperService.js';
import { RuleEngineService } from './RuleEngineService.js';
import { calculatePriceChange } from '@pricy/shared';

export class PriceCheckService {
  constructor() {
    this.scraper = new PriceScraperService();
    this.ruleEngine = new RuleEngineService();
  }

  async checkAllCompetitors() {
    console.log('🔍 Starting price check for all competitors...');

    const competitors = await CompetitorModel.find({
      isActive: true
    });

    console.log(`📊 Found ${competitors.length} active competitors to check`);

    let success = 0;
    let failed = 0;

    for (const competitor of competitors) {
      try {
        await this.checkCompetitor(competitor);
        success++;
      } catch (error) {
        console.error(`❌ Failed to check ${competitor.name}:`, error.message);
        failed++;
      }
    }

    console.log(`✅ Price check complete. Success: ${success}, Failed: ${failed}`);
    return { success, failed, total: competitors.length };
  }

  async checkCompetitor(competitor) {
    const product = await ProductModel.findById(competitor.productId);
    if (!product) {
      console.warn(`⚠️ Product not found for competitor ${competitor._id}`);
      return;
    }

    const result = await this.scraper.scrapePrice(competitor.url, competitor.selectors);

    if (result.success) {
      const previousPrice = competitor.currentPrice;
      const newPrice = result.price;

      competitor.currentPrice = newPrice;
      competitor.currency = result.currency || competitor.currency;
      competitor.lastCheckedAt = new Date();
      competitor.checkStatus = 'success';
      competitor.errorMessage = null;

      if (previousPrice !== newPrice) {
        competitor.lastPriceChange = new Date();

        const priceData = calculatePriceChange(newPrice, previousPrice);

        await PriceHistoryModel.create({
          competitorId: competitor._id,
          productId: competitor.productId,
          userId: competitor.userId,
          price: newPrice,
          previousPrice,
          currency: competitor.currency,
          priceChange: priceData?.change || null,
          priceChangePercent: priceData?.changePercent || null,
          source: 'scraper'
        });

        await this.createPriceChangeEvent(competitor, product, newPrice, previousPrice, priceData);
        await this.ruleEngine.evaluatePriceChange(competitor, product, newPrice, previousPrice);
      }

      await competitor.save();
      console.log(`✅ ${competitor.name}: ${newPrice} ${competitor.currency}`);
    } else {
      competitor.lastCheckedAt = new Date();
      competitor.checkStatus = 'error';
      competitor.errorMessage = result.error;
      await competitor.save();

      await this.createErrorEvent(competitor, result.error);
      console.log(`❌ ${competitor.name}: ${result.error}`);
    }
  }

  async createPriceChangeEvent(competitor, product, newPrice, previousPrice, priceData) {
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
      data: {
        competitorName: competitor.name,
        productTitle: product.title,
        newPrice,
        previousPrice,
        priceChange: priceData?.change,
        priceChangePercent: priceData?.changePercent
      }
    });
  }

  async createErrorEvent(competitor, errorMessage) {
    await EventModel.create({
      userId: competitor.userId,
      productId: competitor.productId,
      competitorId: competitor._id,
      type: 'competitor_error',
      severity: 'warning',
      title: `Failed to check ${competitor.name}`,
      message: errorMessage,
      data: {
        competitorName: competitor.name,
        url: competitor.url,
        error: errorMessage
      }
    });
  }
}
