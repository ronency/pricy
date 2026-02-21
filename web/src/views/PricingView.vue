<template>
  <div class="pricing-page">
    <div class="pricing-inner">
      <h1 class="page-title">Pricing</h1>
      <p class="page-sub">Transparent pricing for every stage of growth.</p>

      <!-- Toggle annual/monthly -->
      <div class="billing-toggle">
        <span :class="{ active: !annual }">Monthly</span>
        <v-switch
          v-model="annual"
          hide-details
          density="compact"
          color="#00FF41"
          class="mx-3"
          inset
        />
        <span :class="{ active: annual }">Annual</span>
        <span v-if="annual" class="save-badge">Save 20%</span>
      </div>

      <div class="pricing-grid">
        <div
          v-for="plan in plans"
          :key="plan.key"
          :class="['plan-card', { featured: plan.featured, current: plan.key === currentPlan }]"
        >
          <div v-if="plan.featured" class="plan-badge">MOST POPULAR</div>
          <div v-if="plan.key === currentPlan" class="plan-badge current-badge">CURRENT PLAN</div>
          <div class="plan-name">{{ plan.name }}</div>
          <div class="plan-price">
            {{ annual ? plan.annualPrice : plan.monthlyPrice }}
          </div>
          <div class="plan-cycle">
            {{ plan.key === 'free' ? 'forever' : annual ? '/mo, billed annually' : '/month' }}
          </div>

          <ul class="plan-features">
            <li v-for="f in plan.features" :key="f.text" :class="{ disabled: !f.included }">
              <span class="check">{{ f.included ? '\u2713' : '\u2717' }}</span>
              {{ f.text }}
            </li>
          </ul>

          <v-btn
            v-if="plan.key !== currentPlan"
            :color="plan.featured ? '#00FF41' : '#2a2a2a'"
            :class="plan.featured ? 'text-black' : 'text-white'"
            block
            size="large"
            class="plan-cta"
            :loading="loadingPlan === plan.key"
            :to="!isLoggedIn ? '/signup' : undefined"
            @click="isLoggedIn && selectPlan(plan.key)"
          >
            {{ getPlanCta(plan.key) }}
          </v-btn>
          <v-btn
            v-else
            block
            size="large"
            class="plan-cta"
            disabled
            variant="outlined"
          >
            Current Plan
          </v-btn>
        </div>
      </div>

      <!-- Feature comparison table -->
      <h2 class="compare-title">Compare Plans</h2>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th></th>
              <th v-for="plan in plans" :key="plan.key" :class="{ featured: plan.featured }">
                {{ plan.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="feature-label">Products</td>
              <td>5</td>
              <td>50</td>
              <td class="featured-col">250</td>
              <td>1,000+</td>
            </tr>
            <tr>
              <td class="feature-label">Competitors per product</td>
              <td>2</td>
              <td>3</td>
              <td class="featured-col">5</td>
              <td>5</td>
            </tr>
            <tr>
              <td class="feature-label">Check frequency</td>
              <td>Daily</td>
              <td>Daily</td>
              <td class="featured-col">Hourly</td>
              <td>Hourly</td>
            </tr>
            <tr>
              <td class="feature-label">Price comparison tool</td>
              <td><span class="tbl-check">&check;</span></td>
              <td><span class="tbl-check">&check;</span></td>
              <td class="featured-col"><span class="tbl-check">&check;</span></td>
              <td><span class="tbl-check">&check;</span></td>
            </tr>
            <tr>
              <td class="feature-label">Dashboard insights</td>
              <td><span class="tbl-check">&check;</span></td>
              <td><span class="tbl-check">&check;</span></td>
              <td class="featured-col"><span class="tbl-check">&check;</span></td>
              <td><span class="tbl-check">&check;</span></td>
            </tr>
            <tr>
              <td class="feature-label">Webhooks</td>
              <td><span class="tbl-x">&cross;</span></td>
              <td><span class="tbl-x">&cross;</span></td>
              <td class="featured-col"><span class="tbl-check">&check;</span></td>
              <td><span class="tbl-check">&check;</span></td>
            </tr>
            <tr>
              <td class="feature-label">Advanced rules</td>
              <td><span class="tbl-x">&cross;</span></td>
              <td><span class="tbl-x">&cross;</span></td>
              <td class="featured-col"><span class="tbl-check">&check;</span></td>
              <td><span class="tbl-check">&check;</span></td>
            </tr>
            <tr>
              <td class="feature-label">Priority support</td>
              <td><span class="tbl-x">&cross;</span></td>
              <td><span class="tbl-x">&cross;</span></td>
              <td class="featured-col"><span class="tbl-x">&cross;</span></td>
              <td><span class="tbl-check">&check;</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FAQ -->
      <h2 class="compare-title">Frequently Asked Questions</h2>
      <div class="faq-list">
        <v-expansion-panels variant="accordion" class="faq-panels">
          <v-expansion-panel v-for="faq in faqs" :key="faq.q">
            <v-expansion-panel-title class="faq-q">{{ faq.q }}</v-expansion-panel-title>
            <v-expansion-panel-text class="faq-a">{{ faq.a }}</v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </div>

    <v-snackbar v-model="showError" color="error" :timeout="5000">
      {{ error }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { PLAN_PRICES } from '@/config/stripe';
import api from '@/services/api';

const authStore = useAuthStore();
const annual = ref(false);
const loadingPlan = ref(null);
const error = ref(null);
const showError = computed({
  get: () => !!error.value,
  set: (v) => { if (!v) error.value = null; }
});

const isLoggedIn = computed(() => authStore.isLoggedIn);
const currentPlan = computed(() => authStore.currentUser?.plan || null);
const hasActiveSubscription = computed(() => {
  const status = authStore.currentUser?.stripeSubscriptionStatus;
  return status === 'active' || status === 'past_due';
});

const plans = [
  {
    key: 'free',
    name: 'Free',
    monthlyPrice: '$0',
    annualPrice: '$0',
    cta: 'Get Started',
    featured: false,
    features: [
      { text: '5 products', included: true },
      { text: '2 competitors per product', included: true },
      { text: 'Daily price checks', included: true },
      { text: 'Price comparison tool', included: true },
      { text: 'Dashboard insights', included: true },
      { text: 'Webhooks', included: false },
      { text: 'Advanced rules', included: false },
    ]
  },
  {
    key: 'starter',
    name: 'Starter',
    monthlyPrice: '$49',
    annualPrice: '$39',
    cta: 'Subscribe',
    featured: false,
    features: [
      { text: '50 products', included: true },
      { text: '3 competitors per product', included: true },
      { text: 'Daily price checks', included: true },
      { text: 'Price comparison tool', included: true },
      { text: 'Dashboard insights', included: true },
      { text: 'Webhooks', included: false },
      { text: 'Advanced rules', included: false },
    ]
  },
  {
    key: 'pro',
    name: 'Pro',
    monthlyPrice: '$149',
    annualPrice: '$119',
    cta: 'Subscribe',
    featured: true,
    features: [
      { text: '250 products', included: true },
      { text: '5 competitors per product', included: true },
      { text: 'Hourly price checks', included: true },
      { text: 'Price comparison tool', included: true },
      { text: 'Dashboard insights', included: true },
      { text: 'Webhooks', included: true },
      { text: 'Advanced rules', included: true },
    ]
  },
  {
    key: 'advanced',
    name: 'Advanced',
    monthlyPrice: '$299',
    annualPrice: '$239',
    cta: 'Subscribe',
    featured: false,
    features: [
      { text: '1,000+ products', included: true },
      { text: '5 competitors per product', included: true },
      { text: 'Hourly price checks', included: true },
      { text: 'Price comparison tool', included: true },
      { text: 'Dashboard insights', included: true },
      { text: 'Webhooks', included: true },
      { text: 'Advanced rules', included: true },
    ]
  }
];

const faqs = [
  {
    q: 'Can I change plans at any time?',
    a: 'Yes. You can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.'
  },
  {
    q: 'What happens when I hit my product limit?',
    a: 'You won\'t be able to add new products until you upgrade or remove existing ones. Your existing tracking continues uninterrupted.'
  },
  {
    q: 'Can I try before I pay?',
    a: 'Yes. The Free plan lets you track up to 5 products with 2 competitors each — use it as long as you like, no time limit. Upgrade when you\'re ready.'
  },
  {
    q: 'What\'s the refund policy for annual plans?',
    a: 'If you cancel a yearly subscription within the first 30 days, you\'ll receive a prorated refund for the unused time — no questions asked.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards through Stripe. Annual plans can also be paid via invoice.'
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes. If you\'re not satisfied within the first 30 days, we\'ll issue a full refund — no questions asked.'
  }
];

function getPlanCta(planKey) {
  if (!isLoggedIn.value) return 'Get Started';
  if (planKey === 'free') return 'Get Started';
  if (hasActiveSubscription.value) return 'Manage Billing';
  return 'Subscribe';
}

async function selectPlan(planKey) {
  if (planKey === 'free') return;

  // If user already has an active subscription, open the portal instead
  if (hasActiveSubscription.value) {
    loadingPlan.value = planKey;
    try {
      const { data } = await api.createPortalSession();
      window.location.href = data.portalUrl;
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to open billing portal';
      loadingPlan.value = null;
    }
    return;
  }

  // New subscription — create checkout session
  const interval = annual.value ? 'year' : 'month';
  const priceId = PLAN_PRICES[planKey]?.[interval];

  if (!priceId) {
    error.value = 'Price configuration not available. Please contact support.';
    return;
  }

  loadingPlan.value = planKey;
  error.value = null;

  try {
    const { data } = await api.createCheckoutSession(priceId);
    window.location.href = data.checkoutUrl;
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to start checkout';
    loadingPlan.value = null;
  }
}
</script>

<style scoped>
:root {
  --bg: #0D0D0D;
  --bg2: #141414;
  --green: #00FF41;
  --white: #FFFFFF;
  --grey: #888;
  --border: #2a2a2a;
}

.pricing-page {
  background: #0D0D0D;
  min-height: 100vh;
  padding: 60px 20px 80px;
}

.pricing-inner {
  max-width: 1100px;
  margin: 0 auto;
}

.page-title {
  text-align: center;
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
}

.page-sub {
  text-align: center;
  color: #888;
  font-size: 1.05rem;
  margin-bottom: 32px;
}

/* Billing toggle */
.billing-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 40px;
  font-size: 0.9rem;
  color: #888;
}

.billing-toggle span.active {
  color: #FFFFFF;
  font-weight: 600;
}

.save-badge {
  background: rgba(0, 255, 65, 0.15);
  color: #00FF41;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 4px;
}

/* Plan grid */
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

@media (max-width: 960px) {
  .pricing-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .pricing-grid { grid-template-columns: 1fr; }
}

.plan-card {
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: border-color 0.3s, transform 0.3s;
}

.plan-card:hover {
  border-color: #444;
  transform: translateY(-4px);
}

.plan-card.featured {
  border-color: #00FF41;
  box-shadow: 0 0 30px rgba(0, 255, 65, 0.08);
}

.plan-card.current {
  border-color: #00FF41;
}

.plan-badge {
  position: absolute;
  top: -11px;
  left: 50%;
  transform: translateX(-50%);
  background: #00FF41;
  color: #000;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 3px 12px;
  border-radius: 10px;
  white-space: nowrap;
}

.current-badge {
  background: #FFFFFF;
}

.plan-name {
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.plan-price {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1;
}

.plan-cycle {
  color: #888;
  font-size: 0.85rem;
  margin-bottom: 20px;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 auto;
  border-top: 1px solid #2a2a2a;
  padding-top: 20px;
}

.plan-features li {
  font-size: 0.85rem;
  color: #ccc;
  padding: 6px 0;
}

.plan-features li.disabled {
  color: #555;
}

.plan-features .check {
  margin-right: 6px;
  font-weight: 700;
}

.plan-features li:not(.disabled) .check {
  color: #00FF41;
}

.plan-features li.disabled .check {
  color: #555;
}

.plan-cta {
  margin-top: 24px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* Comparison table */
.compare-title {
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 72px;
  margin-bottom: 32px;
}

.compare-table-wrap {
  overflow-x: auto;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.compare-table th,
.compare-table td {
  padding: 12px 16px;
  text-align: center;
  border-bottom: 1px solid #2a2a2a;
}

.compare-table th {
  font-weight: 700;
  font-size: 0.95rem;
  color: #FFFFFF;
  padding-bottom: 16px;
}

.compare-table th.featured {
  color: #00FF41;
}

.compare-table td.feature-label {
  text-align: left;
  color: #ccc;
  font-weight: 500;
}

.compare-table td.featured-col {
  background: rgba(0, 255, 65, 0.03);
}

.tbl-check {
  color: #00FF41;
  font-weight: 700;
  font-size: 1.1rem;
}

.tbl-x {
  color: #555;
  font-size: 1.1rem;
}

/* FAQ */
.faq-list {
  max-width: 720px;
  margin: 0 auto;
}

.faq-panels {
  background: transparent !important;
}

.faq-panels :deep(.v-expansion-panel) {
  background: #141414 !important;
  border: 1px solid #2a2a2a;
  margin-bottom: 8px;
  border-radius: 8px !important;
}

.faq-panels :deep(.v-expansion-panel-title) {
  font-weight: 600;
  font-size: 0.95rem;
}

.faq-panels :deep(.v-expansion-panel-text__wrapper) {
  color: #aaa;
  font-size: 0.9rem;
  line-height: 1.6;
}
</style>
