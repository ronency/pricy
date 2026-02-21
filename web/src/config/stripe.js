export const PLAN_PRICES = {
  starter: {
    month: import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY,
    year: import.meta.env.VITE_STRIPE_PRICE_STARTER_YEARLY
  },
  pro: {
    month: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
    year: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY
  },
  advanced: {
    month: import.meta.env.VITE_STRIPE_PRICE_ADVANCED_MONTHLY,
    year: import.meta.env.VITE_STRIPE_PRICE_ADVANCED_YEARLY
  }
};
