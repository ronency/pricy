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
    console.log('🔍 Starting price check for tracked products...');

    // Only check competitors for products that are actively tracked
    const trackedProductIds = await ProductModel.find({ isTracked: true }).distinct('_id');

    const competitors = await CompetitorModel.find({
      isActive: true,
      productId: { $in: trackedProductIds }
    });

    console.log(`📊 Found ${competitors.length} active competitors across ${trackedProductIds.length} tracked products`);

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
      return { status: 'skipped', reason: 'product_not_found' };
    }

    console.log(`🔍 Checking ${competitor.name} (${competitor.url})...`);
    const result = await this.scraper.scrapePrice(competitor.url, competitor.selectors);

    if (result.success) {
      const previousPrice = competitor.currentPrice;
      const newPrice = result.price;

      competitor.currentPrice = newPrice;
      competitor.currency = result.currency || competitor.currency;
      competitor.lastCheckedAt = new Date();
      competitor.checkStatus = 'success';
      competitor.errorMessage = null;

      // Save page metadata on first scrape (or if missing)
      if (!competitor.canonicalUrl && result.canonicalUrl) {
        competitor.canonicalUrl = result.canonicalUrl;
      }
      if (!competitor.imageUrl && result.imageUrl) {
        competitor.imageUrl = result.imageUrl;
      }

      // Always record price history on every successful scrape
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
        // First time discovering this competitor's price
        competitor.lastPriceChange = new Date();
        await this.createDiscoveryEvent(competitor, product, newPrice);
        console.log(`🆕 ${competitor.name}: discovered at ${newPrice} ${competitor.currency}`);
      } else if (previousPrice !== newPrice) {
        // Price changed
        competitor.lastPriceChange = new Date();
        await this.createPriceChangeEvent(competitor, product, newPrice, previousPrice, priceData);
        await this.ruleEngine.evaluatePriceChange(competitor, product, newPrice, previousPrice);
        console.log(`📊 ${competitor.name}: ${previousPrice} → ${newPrice} ${competitor.currency}`);
      } else {
        console.log(`✅ ${competitor.name}: ${newPrice} ${competitor.currency} (unchanged)`);
      }

      await competitor.save();
      const isFirstCheck = previousPrice == null;
      return { status: 'success', price: newPrice, previousPrice, changed: !isFirstCheck && previousPrice !== newPrice, firstCheck: isFirstCheck };
    } else {
      competitor.lastCheckedAt = new Date();
      competitor.checkStatus = 'error';
      competitor.errorMessage = result.error;
      await competitor.save();

      await this.createErrorEvent(competitor, result.error);
      console.log(`❌ ${competitor.name}: ${result.error}`);
      return { status: 'error', error: result.error };
    }
  }

  async createDiscoveryEvent(competitor, product, price) {
    await EventModel.create({
      userId: competitor.userId,
      productId: competitor.productId,
      competitorId: competitor._id,
      type: 'price_discovered',
      severity: 'info',
      title: `${competitor.name} price discovered`,
      message: `Found price ${price} ${competitor.currency} for ${product.title}`,
      data: {
        competitorName: competitor.name,
        productTitle: product.title,
        price,
        currency: competitor.currency
      }
    });
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
