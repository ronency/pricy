import { ProductModel } from '../config/productSchema.js';
import { CompetitorModel } from '../config/competitorSchema.js';
import { calculatePriceChange, getSuggestion, getPosition, getAction } from '@pricy/shared';

export async function getDashboardInsights(req, res, next) {
  try {
    // 1. Fetch all tracked products for this user
    const products = await ProductModel.find({
      userId: req.user._id,
      isTracked: true
    }).sort({ title: 1 });

    if (products.length === 0) {
      return res.json({ products: [] });
    }

    const productIds = products.map(p => p._id);

    // 2. Fetch all active competitors for those products in one query
    const competitors = await CompetitorModel.find({
      userId: req.user._id,
      productId: { $in: productIds },
      isActive: true
    });

    // 3. Group competitors by productId
    const competitorsByProduct = {};
    for (const comp of competitors) {
      const pid = comp.productId.toString();
      if (!competitorsByProduct[pid]) competitorsByProduct[pid] = [];
      competitorsByProduct[pid].push(comp);
    }

    // 4. Build insight for each product
    const insights = products.map(product => {
      const pid = product._id.toString();
      const prodCompetitors = competitorsByProduct[pid] || [];
      const yourPrice = product.currentPrice;

      // Competitors with prices
      const pricedCompetitors = prodCompetitors
        .filter(c => c.currentPrice != null)
        .map(c => {
          const priceChange = yourPrice != null
            ? calculatePriceChange(yourPrice, c.currentPrice)
            : null;
          return {
            id: c._id,
            name: c.name,
            url: c.url,
            domain: c.domain,
            imageUrl: c.imageUrl,
            currentPrice: c.currentPrice,
            currency: c.currency,
            lastCheckedAt: c.lastCheckedAt,
            priceDifference: priceChange ? priceChange.change : null,
            priceDifferencePercent: priceChange ? priceChange.changePercent : null
          };
        });

      // Compute aggregate stats
      let lowestCompetitorPrice = null;
      let averageCompetitorPrice = null;
      let recommendation = null;

      if (pricedCompetitors.length > 0) {
        const prices = pricedCompetitors.map(c => c.currentPrice);
        lowestCompetitorPrice = Math.min(...prices);
        averageCompetitorPrice = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;

        if (yourPrice != null) {
          const avgDiff = calculatePriceChange(yourPrice, averageCompetitorPrice);
          const diffPercent = avgDiff ? avgDiff.changePercent : 0;
          recommendation = {
            action: getAction(diffPercent),
            suggestion: getSuggestion(diffPercent),
            position: getPosition(diffPercent),
            diffPercent
          };
        }
      }

      return {
        id: product._id,
        title: product.title,
        imageUrl: product.imageUrl,
        currentPrice: yourPrice,
        currency: product.currency,
        vendor: product.vendor,
        competitorCount: prodCompetitors.length,
        competitors: pricedCompetitors,
        lowestCompetitorPrice,
        averageCompetitorPrice,
        recommendation
      };
    });

    // Sort: most actionable first (largest absolute diffPercent), products without recommendations last
    insights.sort((a, b) => {
      const aAbs = a.recommendation ? Math.abs(a.recommendation.diffPercent) : -1;
      const bAbs = b.recommendation ? Math.abs(b.recommendation.diffPercent) : -1;
      return bAbs - aAbs;
    });

    res.json({ products: insights });
  } catch (error) {
    next(error);
  }
}
