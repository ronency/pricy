export class User {
  constructor(data = {}) {
    this.id = data.id || data._id || null;
    this.email = data.email || '';
    this.name = data.name || '';
    this.shopifyDomain = data.shopifyDomain || null;
    this.shopifyAccessToken = data.shopifyAccessToken || null;
    this.apiKey = data.apiKey || null;
    this.plan = data.plan || 'free';
    this.planLimits = data.planLimits || PlanLimits[data.plan] || PlanLimits.free;
    this.webhookUrl = data.webhookUrl || null;
    this.webhookSecret = data.webhookSecret || null;
    this.emailNotifications = data.emailNotifications !== false;
    this.weeklyDigest = data.weeklyDigest !== false;
    this.isActive = data.isActive !== false;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      shopifyDomain: this.shopifyDomain,
      plan: this.plan,
      planLimits: this.planLimits,
      webhookUrl: this.webhookUrl,
      emailNotifications: this.emailNotifications,
      weeklyDigest: this.weeklyDigest,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export const Plans = ['free', 'starter', 'pro', 'advanced'];

export const PlanLimits = {
  free: {
    maxProducts: 5,
    maxCompetitorsPerProduct: 1,
    checkFrequency: 'daily',
    webhooksEnabled: false,
    advancedRules: false
  },
  starter: {
    maxProducts: 50,
    maxCompetitorsPerProduct: 3,
    checkFrequency: 'daily',
    webhooksEnabled: false,
    advancedRules: false
  },
  pro: {
    maxProducts: 250,
    maxCompetitorsPerProduct: 5,
    checkFrequency: 'hourly',
    webhooksEnabled: true,
    advancedRules: true
  },
  advanced: {
    maxProducts: 1000,
    maxCompetitorsPerProduct: 10,
    checkFrequency: 'hourly',
    webhooksEnabled: true,
    advancedRules: true
  }
};
