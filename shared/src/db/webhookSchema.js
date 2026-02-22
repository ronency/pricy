import mongoose from 'mongoose';
import { WebhookEvents } from '../models/Webhook.js';

const webhookSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  secret: {
    type: String,
    select: false
  },
  events: {
    type: [String],
    enum: WebhookEvents,
    default: ['all']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastDeliveredAt: {
    type: Date,
    default: null
  },
  lastStatus: {
    type: Number,
    default: null
  },
  failureCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

webhookSchema.methods.toClient = function() {
  return {
    id: this._id,
    userId: this.userId,
    url: this.url,
    events: this.events,
    isActive: this.isActive,
    lastDeliveredAt: this.lastDeliveredAt,
    lastStatus: this.lastStatus,
    failureCount: this.failureCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

webhookSchema.index({ userId: 1 });
webhookSchema.index({ isActive: 1 });

export const WebhookModel = mongoose.model('Webhook', webhookSchema);
