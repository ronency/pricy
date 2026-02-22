import mongoose from 'mongoose';
import { PriceHistorySource } from '../models/PriceHistory.js';

const priceHistorySchema = new mongoose.Schema({
  competitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Competitor',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  previousPrice: {
    type: Number,
    default: null
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  priceChange: {
    type: Number,
    default: null
  },
  priceChangePercent: {
    type: Number,
    default: null
  },
  source: {
    type: String,
    enum: PriceHistorySource,
    default: 'scraper'
  },
  rawData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  checkedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

priceHistorySchema.methods.toClient = function() {
  return {
    id: this._id,
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
};

priceHistorySchema.index({ competitorId: 1, checkedAt: -1 });
priceHistorySchema.index({ productId: 1, checkedAt: -1 });
priceHistorySchema.index({ userId: 1, checkedAt: -1 });
priceHistorySchema.index({ checkedAt: -1 });

export const PriceHistoryModel = mongoose.model('PriceHistory', priceHistorySchema);
