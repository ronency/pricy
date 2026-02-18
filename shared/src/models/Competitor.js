export class Competitor {
  constructor(data = {}) {
    this.id = data.id || data._id || null;
    this.userId = data.userId || null;
    this.productId = data.productId || null;
    this.name = data.name || '';
    this.url = data.url || '';
    this.domain = data.domain || '';
    this.currentPrice = data.currentPrice || null;
    this.currency = data.currency || 'USD';
    this.lastCheckedAt = data.lastCheckedAt ? new Date(data.lastCheckedAt) : null;
    this.lastPriceChange = data.lastPriceChange ? new Date(data.lastPriceChange) : null;
    this.checkStatus = data.checkStatus || 'pending';
    this.errorMessage = data.errorMessage || null;
    this.selectors = data.selectors || null;
    this.isActive = data.isActive !== false;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      productId: this.productId,
      name: this.name,
      url: this.url,
      domain: this.domain,
      currentPrice: this.currentPrice,
      currency: this.currency,
      lastCheckedAt: this.lastCheckedAt,
      lastPriceChange: this.lastPriceChange,
      checkStatus: this.checkStatus,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export const CompetitorCheckStatus = ['pending', 'success', 'error', 'blocked'];
