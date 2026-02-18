import mongoose from 'mongoose';
import { RuleTypes, RuleActionTypes } from '@pricy/shared';

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: RuleActionTypes,
    required: true
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const ruleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: RuleTypes,
    required: true
  },
  conditions: {
    threshold: Number,
    thresholdPercent: Number,
    thresholdAmount: Number,
    competitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competitor'
    },
    timeWindowHours: Number
  },
  actions: {
    type: [actionSchema],
    required: true
  },
  priority: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTriggeredAt: {
    type: Date,
    default: null
  },
  triggerCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

ruleSchema.methods.toClient = function() {
  return {
    id: this._id,
    userId: this.userId,
    productId: this.productId,
    name: this.name,
    type: this.type,
    conditions: this.conditions,
    actions: this.actions,
    priority: this.priority,
    isActive: this.isActive,
    lastTriggeredAt: this.lastTriggeredAt,
    triggerCount: this.triggerCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

ruleSchema.index({ userId: 1 });
ruleSchema.index({ userId: 1, productId: 1 });
ruleSchema.index({ userId: 1, isActive: 1 });

export const RuleModel = mongoose.model('Rule', ruleSchema);
