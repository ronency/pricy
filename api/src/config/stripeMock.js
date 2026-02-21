/**
 * Mock Stripe SDK for local development without real Stripe credentials.
 * Enabled via MOCK_BILLING=true in .env.
 *
 * Returns realistic response shapes so controllers work unchanged.
 * Checkout redirects straight to the success_url (skipping Stripe's hosted page).
 */

let counter = 1000;
function mockId(prefix) {
  return `${prefix}_mock_${++counter}`;
}

// These must match the IDs used in MOCK_PRICE_MAP (see stripe.js)
export const MOCK_PRICE_IDS = {
  starter: { month: 'price_mock_starter_monthly', year: 'price_mock_starter_yearly' },
  pro: { month: 'price_mock_pro_monthly', year: 'price_mock_pro_yearly' },
  advanced: { month: 'price_mock_advanced_monthly', year: 'price_mock_advanced_yearly' },
};

const now = () => Math.floor(Date.now() / 1000);
const in30Days = () => now() + 30 * 24 * 60 * 60;

export const mockStripe = {
  customers: {
    async create({ email, name, metadata } = {}) {
      console.log('[MOCK STRIPE] customers.create', { email });
      return { id: mockId('cus'), email, name, metadata };
    }
  },

  checkout: {
    sessions: {
      async create(params = {}) {
        console.log('[MOCK STRIPE] checkout.sessions.create', { mode: params.mode, customer: params.customer });
        return {
          id: mockId('cs'),
          url: params.success_url,
          customer: params.customer,
          mode: params.mode,
          subscription: mockId('sub'),
          metadata: params.metadata
        };
      }
    }
  },

  billingPortal: {
    sessions: {
      async create(params = {}) {
        console.log('[MOCK STRIPE] billingPortal.sessions.create');
        return {
          id: mockId('bps'),
          url: params.return_url
        };
      }
    }
  },

  subscriptions: {
    async retrieve(id) {
      console.log('[MOCK STRIPE] subscriptions.retrieve', id);
      return {
        id,
        status: 'active',
        current_period_end: in30Days(),
        cancel_at_period_end: false,
        customer: 'cus_mock',
        items: {
          data: [{
            id: mockId('si'),
            price: { id: MOCK_PRICE_IDS.pro.month }
          }]
        }
      };
    }
  },

  webhooks: {
    constructEvent(body) {
      console.log('[MOCK STRIPE] webhooks.constructEvent (no signature check)');
      return typeof body === 'string' ? JSON.parse(body) : JSON.parse(body.toString());
    }
  }
};
