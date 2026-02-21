// Mock price IDs matching api/src/config/stripeMock.js
// Used as fallback when VITE_STRIPE_PRICE_* env vars aren't set
const MOCK = {
  starter: { month: 'price_mock_starter_monthly', year: 'price_mock_starter_yearly' },
  pro: { month: 'price_mock_pro_monthly', year: 'price_mock_pro_yearly' },
  advanced: { month: 'price_mock_advanced_monthly', year: 'price_mock_advanced_yearly' },
};

export const PLAN_PRICES = {
  starter: {
    month: import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY || MOCK.starter.month,
    year: import.meta.env.VITE_STRIPE_PRICE_STARTER_YEARLY || MOCK.starter.year
  },
  pro: {
    month: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || MOCK.pro.month,
    year: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY || MOCK.pro.year
  },
  advanced: {
    month: import.meta.env.VITE_STRIPE_PRICE_ADVANCED_MONTHLY || MOCK.advanced.month,
    year: import.meta.env.VITE_STRIPE_PRICE_ADVANCED_YEARLY || MOCK.advanced.year
  }
};
