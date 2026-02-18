export class Webhook {
  constructor(data = {}) {
    this.id = data.id || data._id || null;
    this.userId = data.userId || null;
    this.url = data.url || '';
    this.secret = data.secret || null;
    this.events = data.events || ['all'];
    this.isActive = data.isActive !== false;
    this.lastDeliveredAt = data.lastDeliveredAt ? new Date(data.lastDeliveredAt) : null;
    this.lastStatus = data.lastStatus || null;
    this.failureCount = data.failureCount || 0;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  toJSON() {
    return {
      id: this.id,
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
  }
}

export const WebhookEvents = [
  'all',
  'price_change',
  'rule_triggered',
  'competitor_error',
  'weekly_summary'
];
