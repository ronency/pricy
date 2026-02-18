export class Rule {
  constructor(data = {}) {
    this.id = data.id || data._id || null;
    this.userId = data.userId || null;
    this.productId = data.productId || null;
    this.name = data.name || '';
    this.type = data.type || 'price_below';
    this.conditions = data.conditions || {};
    this.actions = data.actions || [];
    this.priority = data.priority || 0;
    this.isActive = data.isActive !== false;
    this.lastTriggeredAt = data.lastTriggeredAt ? new Date(data.lastTriggeredAt) : null;
    this.triggerCount = data.triggerCount || 0;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  toJSON() {
    return {
      id: this.id,
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
  }
}

export const RuleTypes = [
  'price_below',
  'price_above',
  'price_drop_percent',
  'price_drop_amount',
  'margin_impact',
  'competitor_any_change'
];

export const RuleActionTypes = [
  'webhook',
  'email',
  'log'
];
