export class PriceHistory {
  constructor(data = {}) {
    this.id = data.id || data._id || null;
    this.competitorId = data.competitorId || null;
    this.productId = data.productId || null;
    this.userId = data.userId || null;
    this.price = data.price || null;
    this.previousPrice = data.previousPrice || null;
    this.currency = data.currency || 'USD';
    this.priceChange = data.priceChange || null;
    this.priceChangePercent = data.priceChangePercent || null;
    this.source = data.source || 'scraper';
    this.rawData = data.rawData || null;
    this.checkedAt = data.checkedAt ? new Date(data.checkedAt) : new Date();
  }

  toJSON() {
    return {
      id: this.id,
      competitorId: this.competitorId,
      productId: this.productId,
      price: this.price,
      previousPrice: this.previousPrice,
      currency: this.currency,
      priceChange: this.priceChange,
      priceChangePercent: this.priceChangePercent,
      source: this.source,
      checkedAt: this.checkedAt
    };
  }
}

export const PriceHistorySource = ['scraper', 'api', 'manual', 'extension'];
