import mongoose from 'mongoose';
import { EventTypes, EventSeverity } from '@pricy/shared';

const eventSchema = new mongoose.Schema({
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
  competitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Competitor',
    default: null
  },
  ruleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rule',
    default: null
  },
  type: {
    type: String,
    enum: EventTypes,
    required: true
  },
  severity: {
    type: String,
    enum: EventSeverity,
    default: 'info'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isNotified: {
    type: Boolean,
    default: false
  },
  notifiedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

eventSchema.methods.toClient = function() {
  return {
    id: this._id,
    userId: this.userId,
    productId: this.productId,
    competitorId: this.competitorId,
    ruleId: this.ruleId,
    type: this.type,
    severity: this.severity,
    title: this.title,
    message: this.message,
    data: this.data,
    isRead: this.isRead,
    isNotified: this.isNotified,
    notifiedAt: this.notifiedAt,
    createdAt: this.createdAt
  };
};

eventSchema.index({ userId: 1, createdAt: -1 });
eventSchema.index({ userId: 1, type: 1 });
eventSchema.index({ userId: 1, isRead: 1 });
eventSchema.index({ createdAt: -1 });

export const EventModel = mongoose.model('Event', eventSchema);
