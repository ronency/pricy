import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  shopifyVariantId: String,
  title: { type: String, default: 'Default' },
  sku: String,
  price: Number,
  compareAtPrice: Number,
  inventoryQuantity: { type: Number, default: 0 }
}, { _id: false });

const productSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shopifyProductId: {
    type: String,
    default: null
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  vendor: {
    type: String,
    default: ''
  },
  productType: {
    type: String,
    default: ''
  },
  handle: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: null
  },
  variants: {
    type: [variantSchema],
    default: []
  },
  currentPrice: {
    type: Number,
    default: null
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  isTracked: {
    type: Boolean,
    default: true
  },
  lastSyncedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

productSchema.methods.toClient = function() {
  return {
    id: this._id,
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
};

productSchema.index({ userId: 1 });
productSchema.index({ userId: 1, shopifyProductId: 1 });
productSchema.index({ userId: 1, isTracked: 1 });

export const ProductModel = mongoose.model('Product', productSchema);
