export class Product {
  constructor(data = {}) {
    this.id = data.id || data._id || null;
    this.userId = data.userId || null;
    this.shopifyProductId = data.shopifyProductId || null;
    this.title = data.title || '';
    this.description = data.description || '';
    this.vendor = data.vendor || '';
    this.productType = data.productType || '';
    this.handle = data.handle || '';
    this.imageUrl = data.imageUrl || null;
    this.variants = data.variants || [];
    this.currentPrice = data.currentPrice || null;
    this.currency = data.currency || 'USD';
    this.isTracked = data.isTracked !== false;
    this.lastSyncedAt = data.lastSyncedAt ? new Date(data.lastSyncedAt) : null;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      shopifyProductId: this.shopifyProductId,
      title: this.title,
      description: this.description,
      vendor: this.vendor,
      productType: this.productType,
      handle: this.handle,
      imageUrl: this.imageUrl,
      variants: this.variants,
      currentPrice: this.currentPrice,
      currency: this.currency,
      isTracked: this.isTracked,
      lastSyncedAt: this.lastSyncedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class ProductVariant {
  constructor(data = {}) {
    this.shopifyVariantId = data.shopifyVariantId || null;
    this.title = data.title || 'Default';
    this.sku = data.sku || '';
    this.price = data.price || null;
    this.compareAtPrice = data.compareAtPrice || null;
    this.inventoryQuantity = data.inventoryQuantity || 0;
  }
}
