import mongoose from 'mongoose';
import { CompetitorCheckStatus } from '@pricy/shared';

const competitorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    default: ''
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
  lastCheckedAt: {
    type: Date,
    default: null
  },
  lastPriceChange: {
    type: Date,
    default: null
  },
  checkStatus: {
    type: String,
    enum: CompetitorCheckStatus,
    default: 'pending'
  },
  errorMessage: {
    type: String,
    default: null
  },
  selectors: {
    priceSelector: String,
    titleSelector: String,
    currencySelector: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

competitorSchema.methods.toClient = function() {
  return {
    id: this._id,
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
};

competitorSchema.index({ userId: 1 });
competitorSchema.index({ productId: 1 });
competitorSchema.index({ userId: 1, productId: 1 });
competitorSchema.index({ isActive: 1, lastCheckedAt: 1 });

export const CompetitorModel = mongoose.model('Competitor', competitorSchema);
