export class User {
  constructor(data = {}) {
    this.id = data.id || data._id || null;
    this.email = data.email || '';
    this.name = data.name || '';
    this.shopifyDomain = data.shopifyDomain || null;
    this.shopifyAccessToken = data.shopifyAccessToken || null;
    this.shopifyConnected = data.shopifyConnected || !!data.shopifyDomain;
    this.shopifyScopes = data.shopifyScopes || null;
    this.shopifyTokenExpiresAt = data.shopifyTokenExpiresAt ? new Date(data.shopifyTokenExpiresAt) : null;
    this.apiKey = data.apiKey || null;
    this.plan = data.plan || 'free';
    this.planLimits = data.planLimits || PlanLimits[data.plan] || PlanLimits.free;
    this.stripeSubscriptionStatus = data.stripeSubscriptionStatus || null;
    this.stripeCurrentPeriodEnd = data.stripeCurrentPeriodEnd ? new Date(data.stripeCurrentPeriodEnd) : null;
    this.stripeCancelAtPeriodEnd = data.stripeCancelAtPeriodEnd || false;
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
      shopifyConnected: this.shopifyConnected,
      shopifyScopes: this.shopifyScopes,
      shopifyTokenExpiresAt: this.shopifyTokenExpiresAt,
      plan: this.plan,
      planLimits: this.planLimits,
      stripeSubscriptionStatus: this.stripeSubscriptionStatus,
      stripeCurrentPeriodEnd: this.stripeCurrentPeriodEnd,
      stripeCancelAtPeriodEnd: this.stripeCancelAtPeriodEnd,
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
    maxCompetitorsPerProduct: 2,
    checkFrequency: 'daily',
    webhooksEnabled: false,
    advancedRules: false,
    price: 0
  },
  starter: {
    maxProducts: 50,
    maxCompetitorsPerProduct: 3,
    checkFrequency: 'daily',
    webhooksEnabled: false,
    advancedRules: false,
    price: 49
  },
  pro: {
    maxProducts: 250,
    maxCompetitorsPerProduct: 5,
    checkFrequency: 'hourly',
    webhooksEnabled: true,
    advancedRules: true,
    price: 149
  },
  advanced: {
    maxProducts: 1000,
    maxCompetitorsPerProduct: 5,
    checkFrequency: 'hourly',
    webhooksEnabled: true,
    advancedRules: true,
    price: 299
  }
};
