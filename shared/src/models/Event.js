export class Event {
  constructor(data = {}) {
    this.id = data.id || data._id || null;
    this.userId = data.userId || null;
    this.productId = data.productId || null;
    this.competitorId = data.competitorId || null;
    this.ruleId = data.ruleId || null;
    this.type = data.type || 'price_change';
    this.severity = data.severity || 'info';
    this.title = data.title || '';
    this.message = data.message || '';
    this.data = data.data || {};
    this.isRead = data.isRead || false;
    this.isNotified = data.isNotified || false;
    this.notifiedAt = data.notifiedAt ? new Date(data.notifiedAt) : null;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
  }

  toJSON() {
    return {
      id: this.id,
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
  }
}

export const EventTypes = [
  'price_change',
  'price_drop',
  'price_increase',
  'competitor_added',
  'competitor_error',
  'rule_triggered',
  'product_synced',
  'weekly_summary'
];

export const EventSeverity = ['info', 'warning', 'alert', 'critical'];
