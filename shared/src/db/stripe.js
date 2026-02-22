import Stripe from 'stripe';
import { mockStripe, MOCK_PRICE_IDS } from './stripeMock.js';

const isMockBilling = process.env.MOCK_BILLING === 'true';

export const stripe = isMockBilling
  ? mockStripe
  : process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

if (isMockBilling) {
  console.log('[MOCK STRIPE] Mock billing enabled — no real Stripe calls will be made');
}

// Map price IDs to plan names and intervals
// Built from STRIPE_PRICE_* environment variables
const priceEntries = [
  { env: 'STRIPE_PRICE_STARTER_MONTHLY', plan: 'starter', interval: 'month' },
  { env: 'STRIPE_PRICE_STARTER_YEARLY', plan: 'starter', interval: 'year' },
  { env: 'STRIPE_PRICE_PRO_MONTHLY', plan: 'pro', interval: 'month' },
  { env: 'STRIPE_PRICE_PRO_YEARLY', plan: 'pro', interval: 'year' },
  { env: 'STRIPE_PRICE_ADVANCED_MONTHLY', plan: 'advanced', interval: 'month' },
  { env: 'STRIPE_PRICE_ADVANCED_YEARLY', plan: 'advanced', interval: 'year' },
];

// { priceId -> { plan, interval } }
export const PRICE_TO_PLAN = {};

// { plan -> { month: priceId, year: priceId } }
export const PLAN_TO_PRICES = {};

for (const { env, plan, interval } of priceEntries) {
  const priceId = process.env[env];
  if (priceId) {
    PRICE_TO_PLAN[priceId] = { plan, interval };
    if (!PLAN_TO_PRICES[plan]) PLAN_TO_PRICES[plan] = {};
    PLAN_TO_PRICES[plan][interval] = priceId;
  }
}

// In mock mode, populate maps with mock price IDs if real ones aren't set
if (isMockBilling && Object.keys(PRICE_TO_PLAN).length === 0) {
  for (const [plan, intervals] of Object.entries(MOCK_PRICE_IDS)) {
    for (const [interval, priceId] of Object.entries(intervals)) {
      PRICE_TO_PLAN[priceId] = { plan, interval };
      if (!PLAN_TO_PRICES[plan]) PLAN_TO_PRICES[plan] = {};
      PLAN_TO_PRICES[plan][interval] = priceId;
    }
  }
}

export function getPlanFromPriceId(priceId) {
  return PRICE_TO_PLAN[priceId]?.plan || null;
}
