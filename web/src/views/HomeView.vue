<template>
  <div class="landing">
    <!-- ─── Hero ─── -->
    <section class="hero">
      <div class="hero-inner">
        <div class="status-badge">
          <span class="pulse-dot" />
          <span class="status-text">SYSTEM STATUS: OPTIMIZING MARGINS</span>
        </div>

        <h1 class="hero-h1">
          Your Competitors just changed their prices.
          <br />
          <span class="green">Did you?</span>
        </h1>

        <p class="hero-sub">
          A headless pricing API for Shopify Power-Sellers — real-time competitor
          tracking, rule-based repricing logic, and instant Webhook execution.
        </p>

        <v-btn
          color="#00FF41"
          size="x-large"
          class="hero-cta text-black"
          @click="scrollTo('lead')"
        >
          RUN INSTANT PRICE AUDIT
        </v-btn>
      </div>
    </section>

    <!-- ─── Interactive Console ─── -->
    <section class="section console-section">
      <div class="section-inner">
        <h2 class="sec-title">See It In Action</h2>
        <p class="sec-sub">Three stages. One automated pipeline. Zero guesswork.</p>

        <div class="console-card">
          <div class="console-tabs">
            <button
              v-for="(tab, i) in tabs"
              :key="i"
              :class="['console-tab', { active: activeTab === i }]"
              @click="switchTab(i)"
            >
              {{ tab.name }}
            </button>
          </div>
          <div class="console-body">
            <pre class="console-pre"><code>{{ displayedText[activeTab] }}<span class="blink">_</span></code></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Pricing ─── -->
    <section class="section pricing-section">
      <div class="section-inner">
        <h2 class="sec-title">Pricing</h2>
        <p class="sec-sub">Transparent pricing for every stage of growth.</p>

        <div class="pricing-grid">
          <div
            v-for="plan in plans"
            :key="plan.name"
            :class="['plan-card', { featured: plan.featured }]"
          >
            <div v-if="plan.featured" class="plan-badge">MOST POPULAR</div>
            <div class="plan-name">{{ plan.name }}</div>
            <div class="plan-price">{{ plan.price }}</div>
            <div class="plan-cycle">{{ plan.cycle }}</div>
            <ul class="plan-features">
              <li v-for="f in plan.features" :key="f">
                <span class="check">&#10003;</span> {{ f }}
              </li>
            </ul>
            <v-btn
              :color="plan.featured ? '#00FF41' : '#2a2a2a'"
              :class="plan.featured ? 'text-black' : 'text-white'"
              block
              size="large"
              to="/signup"
              class="plan-cta"
            >
              {{ plan.cta }}
            </v-btn>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Lead Magnet: Price Comparison ─── -->
    <section id="lead" class="section lead-section">
      <div class="section-inner lead-inner">
        <h2 class="sec-title">
          Compare Your Price <span class="green">vs. The Competition</span>
        </h2>
        <p class="sec-sub">
          Paste two product URLs. We'll scrape both pages, compare prices, and tell
          you exactly what to do — in seconds.
        </p>

        <div class="lead-card">
          <v-form ref="compareFormRef" @submit.prevent="runCompare">
            <v-text-field
              v-model="yourUrl"
              label="Your Product URL"
              placeholder="https://yourstore.com/products/example"
              :rules="[rules.required, rules.url]"
              variant="outlined"
              bg-color="#111"
              base-color="#444"
              color="#00FF41"
              hide-details="auto"
              :disabled="compareLoading || !!compareResult"
              density="comfortable"
              class="mb-3"
            />
            <v-text-field
              v-model="competitorUrl"
              label="Competitor Product URL"
              placeholder="https://competitor.com/products/similar"
              :rules="[rules.required, rules.url]"
              variant="outlined"
              bg-color="#111"
              base-color="#444"
              color="#00FF41"
              hide-details="auto"
              :disabled="compareLoading || !!compareResult"
              density="comfortable"
              class="mb-3"
            />
            <v-text-field
              v-model.number="monthlyUnits"
              label="Monthly units sold (optional — for profit estimation)"
              placeholder="e.g. 200"
              type="number"
              variant="outlined"
              bg-color="#111"
              base-color="#444"
              color="#00FF41"
              hide-details="auto"
              :disabled="compareLoading"
              density="comfortable"
              class="mb-4"
            />
            <v-btn
              v-if="!compareResult"
              type="submit"
              color="#00FF41"
              size="large"
              block
              :loading="compareLoading"
              class="text-black lead-btn"
            >
              COMPARE PRICES
            </v-btn>
            <v-btn
              v-else
              color="#2a2a2a"
              size="large"
              block
              class="text-white lead-btn"
              @click="resetCompare"
            >
              RUN ANOTHER COMPARISON
            </v-btn>
          </v-form>

          <v-alert
            v-if="compareError"
            type="error"
            variant="tonal"
            class="mt-4"
            closable
            @click:close="compareError = ''"
          >
            {{ compareError }}
          </v-alert>

          <!-- Results -->
          <div v-if="compareResult" class="cmp-result">
            <!-- Price Cards -->
            <div class="cmp-prices">
              <div class="cmp-price-card">
                <div class="cmp-label">YOUR PRICE</div>
                <div class="cmp-amount">{{ fmtCurrency(compareResult.yourProduct.price, compareResult.yourProduct.currency) }}</div>
                <div class="cmp-domain">{{ getDomain(compareResult.yourProduct.url) }}</div>
              </div>
              <div class="cmp-vs">VS</div>
              <div class="cmp-price-card">
                <div class="cmp-label">COMPETITOR</div>
                <template v-if="compareResult.analysis.currencyConversion?.applied">
                  <div class="cmp-amount">{{ fmtCurrency(compareResult.analysis.currencyConversion.competitorConvertedPrice, compareResult.analysis.currencyConversion.targetCurrency) }}</div>
                  <div class="cmp-original">Originally {{ fmtCurrency(compareResult.competitor.price, compareResult.competitor.currency) }}</div>
                </template>
                <template v-else>
                  <div class="cmp-amount">{{ fmtCurrency(compareResult.competitor.price, compareResult.competitor.currency) }}</div>
                </template>
                <div class="cmp-domain">{{ getDomain(compareResult.competitor.url) }}</div>
              </div>
            </div>

            <!-- Currency Conversion Notice -->
            <div v-if="compareResult.analysis.currencyConversion?.applied" class="cmp-currency-notice">
              <span class="cmp-currency-icon">&#x1F4B1;</span>
              {{ compareResult.analysis.currencyConversion.note }}
              <span class="cmp-currency-rate">
                (1 {{ compareResult.analysis.currencyConversion.competitorOriginalCurrency }}
                = {{ compareResult.analysis.currencyConversion.exchangeRate }}
                {{ compareResult.analysis.currencyConversion.targetCurrency }})
              </span>
            </div>

            <!-- Analysis -->
            <div class="cmp-analysis">
              <div class="cmp-row">
                <span class="cmp-meta">Difference</span>
                <span class="cmp-val">
                  {{ fmtDiff(compareResult.analysis.priceDifference) }}
                  ({{ compareResult.analysis.priceDifferencePercent > 0 ? '+' : '' }}{{ compareResult.analysis.priceDifferencePercent }}%)
                </span>
                <span
                  :class="['cmp-chip', positionClass(compareResult.analysis.position)]"
                >
                  {{ positionLabel(compareResult.analysis.position) }}
                </span>
              </div>

              <!-- Recommendation -->
              <div :class="['cmp-rec', positionClass(compareResult.analysis.position)]">
                <div class="cmp-rec-head">
                  <span class="cmp-rec-icon">{{ recIcon(compareResult.analysis.position) }}</span>
                  <span class="cmp-rec-action">{{ recAction(compareResult.analysis) }}</span>
                </div>
                <div class="cmp-rec-body">{{ compareResult.analysis.suggestion }}</div>
              </div>

              <!-- Profit Estimation -->
              <div v-if="monthlyUnits > 0 && profitEstimate !== null" class="cmp-profit">
                <div class="cmp-profit-label">ESTIMATED MONTHLY IMPACT</div>
                <div :class="['cmp-profit-val', profitEstimate >= 0 ? 'green' : 'amber']">
                  {{ profitEstimate >= 0 ? '+' : '-' }}{{ fmtCurrency(Math.abs(profitEstimate), compareResult?.yourProduct?.currency) }}/mo
                </div>
                <div class="cmp-profit-note">
                  Based on {{ monthlyUnits.toLocaleString() }} units/mo and the recommended price adjustment.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Footer CTA ─── -->
    <section class="section footer-cta">
      <h2 class="sec-title">Stop leaving money on the table.</h2>
      <v-btn
        color="#00FF41"
        size="x-large"
        to="/signup"
        class="text-black mt-6"
      >
        START FREE TRIAL
      </v-btn>
      <p class="footer-note">No credit card required. 5 products free forever.</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { formatPrice, extractDomain } from '@pricy/shared';
import api from '@/services/api';

// ─── Console Typing Animation ───
const tabs = [
  {
    name: 'monitor.log',
    content: `[14:20:01] GET https://competitor-a.com/product-xyz ... 200 OK
[14:20:02] Extracting: price_selector_css: ".price-item--sale"
[14:20:02] Result: $119.99 (USD)
[14:20:04] GET https://competitor-b.com/sku/NKE-90 ... 200 OK
[14:20:05] Extracting: json-ld schema → offers.price
[14:20:05] Result: $124.50 (USD)
[14:20:06] ✓ 2 competitors scraped in 4.8s`
  },
  {
    name: 'analysis.engine',
    content: `// Rule Engine evaluating price deltas
const delta = competitorPrice - myPrice;
const margin = (myPrice - cost) / myPrice;

if (competitorPrice < myPrice && margin > 0.20) {
    status:     "ACTION_REQUIRED"
    suggestion: "MATCH_COMPETITOR"
    new_price:  competitorPrice - 0.05
    est_lift:   "+12% conversion rate"
}`
  },
  {
    name: 'webhook.out',
    content: `POST https://api.yourstore.com/v1/update → 200
{
  "event":           "price_gap_detected",
  "sku":             "NKE-AIR-MAX-90",
  "current_price":   125.00,
  "suggested_price": 119.94,
  "savings":         "$5.06 per unit",
  "confidence":      0.94,
  "action":          "auto_reprice",
  "webhook_status":  "delivered ✓"
}`
  }
];

const activeTab = ref(0);
const displayedText = ref(tabs.map(() => ''));
const typedTabs = ref(new Set());
let typeTimer = null;

function typeTab(index) {
  if (typedTabs.value.has(index)) {
    displayedText.value[index] = tabs[index].content;
    return;
  }
  const full = tabs[index].content;
  let pos = 0;
  clearInterval(typeTimer);
  displayedText.value[index] = '';

  typeTimer = setInterval(() => {
    if (pos < full.length) {
      // Type 2-3 chars at a time for speed
      const chunk = full.slice(pos, pos + 2);
      displayedText.value[index] += chunk;
      pos += 2;
    } else {
      clearInterval(typeTimer);
      typedTabs.value.add(index);
    }
  }, 16);
}

function switchTab(i) {
  activeTab.value = i;
  nextTick(() => typeTab(i));
}

onMounted(() => typeTab(0));
onUnmounted(() => clearInterval(typeTimer));

// ─── Pricing Plans ───
const plans = [
  {
    name: 'Free',
    price: '$0',
    cycle: 'forever',
    features: ['5 products', '1 competitor each', 'Daily price checks', 'Compare tool access'],
    cta: 'Get Started',
    featured: false
  },
  {
    name: 'Starter',
    price: '$49',
    cycle: '/month',
    features: ['50 products', '3 competitors each', 'Daily price checks', 'Email summaries'],
    cta: 'Start Trial',
    featured: false
  },
  {
    name: 'Pro',
    price: '$149',
    cycle: '/month',
    features: ['250 products', '5 competitors each', 'Hourly price checks', 'Webhooks enabled', 'Rule engine'],
    cta: 'Start Trial',
    featured: true
  },
  {
    name: 'Advanced',
    price: '$299+',
    cycle: '/month',
    features: ['1,000+ products', 'Unlimited competitors', 'High-frequency checks', 'Custom rules', 'Priority support'],
    cta: 'Contact Us',
    featured: false
  }
];

// ─── Lead Magnet: Comparison ───
const compareFormRef = ref(null);
const yourUrl = ref('');
const competitorUrl = ref('');
const monthlyUnits = ref(null);
const compareLoading = ref(false);
const compareError = ref('');
const compareResult = ref(null);

const rules = {
  required: v => !!v || 'Required',
  url: v => {
    try {
      const u = new URL(v);
      return (u.protocol === 'http:' || u.protocol === 'https:') || 'Enter a valid URL';
    } catch {
      return 'Enter a valid URL';
    }
  }
};

async function runCompare() {
  const { valid } = await compareFormRef.value.validate();
  if (!valid) return;

  compareLoading.value = true;
  compareError.value = '';
  compareResult.value = null;

  try {
    const { data } = await api.comparePrices({
      yourUrl: yourUrl.value,
      competitorUrl: competitorUrl.value
    });
    compareResult.value = data;
  } catch (err) {
    compareError.value =
      err.response?.data?.error?.message ||
      'Could not compare prices. Please check both URLs and try again.';
  } finally {
    compareLoading.value = false;
  }
}

function resetCompare() {
  compareResult.value = null;
  compareError.value = '';
  yourUrl.value = '';
  competitorUrl.value = '';
  monthlyUnits.value = null;
  nextTick(() => compareFormRef.value?.resetValidation());
}

const profitEstimate = computed(() => {
  if (!compareResult.value || !monthlyUnits.value || monthlyUnits.value <= 0) return null;
  const a = compareResult.value.analysis;
  const pos = a.position;
  const diff = Math.abs(a.priceDifference);
  if (diff === 0) return 0;
  // If cheaper → recommendation is "raise price" → gain per unit = portion of the gap
  // If more expensive → recommendation is "lower price" → assume capturing more sales covers it
  if (pos === 'cheaper') {
    // Suggest raising price by ~half the gap to stay competitive but gain margin
    return Math.round(diff * 0.5 * monthlyUnits.value * 100) / 100;
  }
  // More expensive: lowering price by the gap could lift conversion ~15-25%
  const conversionLift = 0.20;
  const newSales = Math.round(monthlyUnits.value * conversionLift);
  const yourPrice = compareResult.value.yourProduct.price;
  return Math.round((newSales * (yourPrice - diff) - 0) * 100) / 100;
});

function fmtCurrency(amount, currency) {
  return formatPrice(amount, currency || 'USD');
}

function getDomain(url) {
  return extractDomain(url) || url;
}

function fmtDiff(diff) {
  const prefix = diff > 0 ? '+' : diff < 0 ? '-' : '';
  const currency = compareResult.value?.yourProduct?.currency || 'USD';
  return `${prefix}${formatPrice(Math.abs(diff), currency)}`;
}

function positionClass(pos) {
  if (pos === 'cheaper') return 'pos-cheaper';
  if (pos === 'same') return 'pos-same';
  return 'pos-expensive';
}

function positionLabel(pos) {
  if (pos === 'cheaper') return 'CHEAPER';
  if (pos === 'same') return 'SAME PRICE';
  return 'MORE EXPENSIVE';
}

function recIcon(pos) {
  if (pos === 'cheaper') return '\u2197'; // ↗ raise
  if (pos === 'same') return '\u2192';    // → hold
  return '\u2198';                         // ↘ lower
}

function recAction(analysis) {
  if (analysis.position === 'cheaper') return 'CONSIDER RAISING PRICE';
  if (analysis.position === 'same') return 'HOLD CURRENT PRICE';
  return 'CONSIDER LOWERING PRICE';
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
</script>

<style scoped>
/* ─── Foundation (CSS vars used by sections below) ─── */
.landing {
  --bg: #0D0D0D;
  --bg2: #141414;
  --bg3: #1a1a1a;
  --green: #00FF41;
  --amber: #F2A900;
  --white: #FFFFFF;
  --grey: #888;
  --border: #2a2a2a;

  min-height: 100vh;
  overflow-x: hidden;
}
.green { color: var(--green); }
.amber { color: var(--amber); }

/* ─── Hero ─── */
.hero {
  padding: 80px 24px 100px;
  text-align: center;
  background:
    radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,255,65,.06) 0%, transparent 70%),
    var(--bg);
}
.hero-inner {
  max-width: 800px;
  margin: 0 auto;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 6px 16px;
  margin-bottom: 32px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  letter-spacing: 1.5px;
  color: var(--green);
}
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,65,.5); }
  50% { box-shadow: 0 0 0 6px rgba(0,255,65,0); }
}
.hero-h1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.5px;
  margin-bottom: 24px;
}
.hero-sub {
  font-size: 1.1rem;
  color: var(--grey);
  line-height: 1.7;
  max-width: 600px;
  margin: 0 auto 40px;
}
.hero-cta {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  letter-spacing: 1px;
}

/* ─── Sections ─── */
.section {
  padding: 100px 24px;
}
.section-inner {
  max-width: 1100px;
  margin: 0 auto;
}
.sec-title {
  text-align: center;
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  font-weight: 800;
  margin-bottom: 12px;
}
.sec-sub {
  text-align: center;
  color: var(--grey);
  font-size: 1rem;
  max-width: 550px;
  margin: 0 auto 48px;
  line-height: 1.6;
}

/* ─── Console ─── */
.console-section {
  background: var(--bg2);
}
.console-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 60px rgba(0,255,65,.04);
}
.console-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
}
.console-tab {
  flex: 1;
  padding: 14px 0;
  background: none;
  border: none;
  color: var(--grey);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: color .2s, box-shadow .2s;
  border-bottom: 2px solid transparent;
}
.console-tab.active {
  color: var(--green);
  border-bottom-color: var(--green);
}
.console-tab:hover {
  color: var(--white);
}
.console-body {
  padding: 24px;
  min-height: 220px;
}
.console-pre {
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  line-height: 1.8;
  color: var(--green);
  white-space: pre-wrap;
  word-break: break-word;
}
.blink {
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}

/* ─── Pricing ─── */
.pricing-section {
  background: var(--bg);
}
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
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: border-color .3s, transform .3s;
}
.plan-card:hover {
  border-color: #444;
  transform: translateY(-4px);
}
.plan-card.featured {
  border-color: var(--green);
  box-shadow: 0 0 30px rgba(0,255,65,.08);
}
.plan-badge {
  position: absolute;
  top: -11px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--green);
  color: #000;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 3px 12px;
  border-radius: 10px;
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
  color: var(--grey);
  font-size: 0.85rem;
  margin-bottom: 20px;
}
.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 auto;
  border-top: 1px solid var(--border);
  padding-top: 20px;
}
.plan-features li {
  font-size: 0.85rem;
  color: #ccc;
  padding: 6px 0;
}
.plan-features .check {
  color: var(--green);
  margin-right: 6px;
  font-weight: 700;
}
.plan-cta {
  margin-top: 24px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* ─── Lead Magnet ─── */
.lead-section {
  background: var(--bg2);
}
.lead-inner {
  max-width: 720px;
}
.lead-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
}
.lead-btn {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  letter-spacing: 1px;
}

/* ─── Comparison Results ─── */
.cmp-result {
  margin-top: 28px;
  padding-top: 28px;
  border-top: 1px solid var(--border);
}
.cmp-prices {
  display: flex;
  align-items: center;
  gap: 16px;
}
.cmp-price-card {
  flex: 1;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
}
.cmp-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 2px;
  color: var(--grey);
  margin-bottom: 8px;
}
.cmp-amount {
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 6px;
}
.cmp-domain {
  font-size: 0.8rem;
  color: var(--grey);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cmp-vs {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--grey);
  flex-shrink: 0;
}

/* Currency conversion */
.cmp-original {
  font-size: 0.8rem;
  color: var(--grey);
  margin-bottom: 4px;
}
.cmp-currency-notice {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(242,169,0,.06);
  border: 1px solid rgba(242,169,0,.2);
  border-radius: 8px;
  font-size: 0.82rem;
  color: var(--amber);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.cmp-currency-icon {
  font-size: 1rem;
}
.cmp-currency-rate {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--grey);
}

.cmp-analysis {
  margin-top: 20px;
}
.cmp-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  flex-wrap: wrap;
}
.cmp-meta {
  font-size: 0.8rem;
  color: var(--grey);
}
.cmp-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  font-weight: 600;
}
.cmp-chip {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 3px 10px;
  border-radius: 4px;
  margin-left: auto;
}
.cmp-chip.pos-cheaper {
  background: rgba(0,255,65,.12);
  color: var(--green);
}
.cmp-chip.pos-same {
  background: rgba(255,255,255,.08);
  color: var(--grey);
}
.cmp-chip.pos-expensive {
  background: rgba(242,169,0,.12);
  color: var(--amber);
}

/* Recommendation block */
.cmp-rec {
  margin-top: 16px;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid;
}
.cmp-rec.pos-cheaper {
  background: rgba(0,255,65,.05);
  border-color: rgba(0,255,65,.2);
}
.cmp-rec.pos-same {
  background: rgba(255,255,255,.03);
  border-color: var(--border);
}
.cmp-rec.pos-expensive {
  background: rgba(242,169,0,.05);
  border-color: rgba(242,169,0,.2);
}
.cmp-rec-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.cmp-rec-icon {
  font-size: 1.2rem;
}
.cmp-rec-action {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 1.5px;
}
.pos-cheaper .cmp-rec-action { color: var(--green); }
.pos-same .cmp-rec-action { color: var(--grey); }
.pos-expensive .cmp-rec-action { color: var(--amber); }
.cmp-rec-body {
  font-size: 0.9rem;
  color: #ccc;
  line-height: 1.6;
}

/* Profit estimation */
.cmp-profit {
  margin-top: 16px;
  text-align: center;
  padding: 24px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.cmp-profit-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 2px;
  color: var(--grey);
  margin-bottom: 8px;
}
.cmp-profit-val {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 8px;
}
.cmp-profit-note {
  font-size: 0.8rem;
  color: var(--grey);
  line-height: 1.5;
}

@media (max-width: 600px) {
  .cmp-prices { flex-direction: column; }
  .cmp-vs { display: none; }
}

/* ─── Footer CTA ─── */
.footer-cta {
  text-align: center;
  padding-bottom: 80px;
  background: var(--bg);
}
.footer-note {
  margin-top: 16px;
  color: var(--grey);
  font-size: 0.85rem;
}
</style>
