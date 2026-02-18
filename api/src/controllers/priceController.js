import { PriceHistoryModel } from '../config/priceHistorySchema.js';
import { CompetitorModel } from '../config/competitorSchema.js';
import { ProductModel } from '../config/productSchema.js';

export async function getLatestPrices(req, res, next) {
  try {
    const { product_id } = req.query;

    const query = { userId: req.user._id };
    if (product_id) {
      query.productId = product_id;
    }

    const competitors = await CompetitorModel.find({
      ...query,
      isActive: true
    });

    const prices = competitors.map(c => ({
      competitorId: c._id,
      competitorName: c.name,
      productId: c.productId,
      url: c.url,
      price: c.currentPrice,
      currency: c.currency,
      lastCheckedAt: c.lastCheckedAt,
      checkStatus: c.checkStatus
    }));

    res.json({ prices });
  } catch (error) {
    next(error);
  }
}

export async function getPriceHistory(req, res, next) {
  try {
    const { competitor_id, product_id, from, to, limit = 100 } = req.query;

    const query = { userId: req.user._id };
    if (competitor_id) query.competitorId = competitor_id;
    if (product_id) query.productId = product_id;

    if (from || to) {
      query.checkedAt = {};
      if (from) query.checkedAt.$gte = new Date(from);
      if (to) query.checkedAt.$lte = new Date(to);
    }

    const history = await PriceHistoryModel
      .find(query)
      .sort({ checkedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      history: history.map(h => h.toClient())
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductPriceComparison(req, res, next) {
  try {
    const { productId } = req.params;

    const product = await ProductModel.findOne({
      _id: productId,
      userId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        error: { message: 'Product not found', code: 'NOT_FOUND' }
      });
    }

    const competitors = await CompetitorModel.find({
      productId,
      userId: req.user._id,
      isActive: true
    });

    const comparison = {
      product: {
        id: product._id,
        title: product.title,
        price: product.currentPrice,
        currency: product.currency
      },
      competitors: competitors.map(c => ({
        id: c._id,
        name: c.name,
        url: c.url,
        price: c.currentPrice,
        currency: c.currency,
        lastCheckedAt: c.lastCheckedAt,
        priceDifference: product.currentPrice && c.currentPrice
          ? c.currentPrice - product.currentPrice
          : null,
        priceDifferencePercent: product.currentPrice && c.currentPrice
          ? ((c.currentPrice - product.currentPrice) / product.currentPrice * 100).toFixed(2)
          : null
      })),
      lowestCompetitorPrice: null,
      highestCompetitorPrice: null,
      averageCompetitorPrice: null
    };

    const validPrices = competitors
      .map(c => c.currentPrice)
      .filter(p => p !== null);

    if (validPrices.length > 0) {
      comparison.lowestCompetitorPrice = Math.min(...validPrices);
      comparison.highestCompetitorPrice = Math.max(...validPrices);
      comparison.averageCompetitorPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    }

    res.json(comparison);
  } catch (error) {
    next(error);
  }
}
