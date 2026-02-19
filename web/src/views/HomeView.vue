<template>
  <div class="landing">
    <!-- ─── Floating Nav ─── -->
    <nav class="lnav">
      <div class="lnav-inner">
        <router-link to="/" class="lnav-logo">Pricy</router-link>
        <div class="lnav-links">
          <v-btn variant="text" to="/compare" class="text-white" size="small">Compare</v-btn>
          <template v-if="!authStore.isLoggedIn">
            <v-btn variant="text" to="/login" class="text-white" size="small">Login</v-btn>
            <v-btn variant="outlined" to="/signup" color="#00FF41" size="small">Sign Up</v-btn>
          </template>
          <v-btn v-else variant="outlined" to="/dashboard" color="#00FF41" size="small">Dashboard</v-btn>
        </div>
      </div>
    </nav>

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

    <!-- ─── Lead Magnet ─── -->
    <section id="lead" class="section lead-section">
      <div class="section-inner lead-inner">
        <h2 class="sec-title">
          Find Your <span class="green">Price Leaks</span>
        </h2>
        <p class="sec-sub">
          Paste a product URL. We'll scrape it, analyse the pricing, and show you
          how much margin you could recover — in seconds.
        </p>

        <div class="lead-card">
          <v-form ref="auditFormRef" @submit.prevent="runAudit">
            <div class="lead-form-row">
              <v-text-field
                v-model="auditUrl"
                label="Product URL"
                placeholder="https://yourstore.com/products/example"
                :rules="[rules.required, rules.url]"
                variant="outlined"
                bg-color="#111"
                base-color="#444"
                color="#00FF41"
                hide-details="auto"
                :disabled="auditLoading || !!auditResult"
                density="comfortable"
                class="lead-input"
              />
              <v-btn
                v-if="!auditResult"
                type="submit"
                color="#00FF41"
                size="large"
                :loading="auditLoading"
                class="text-black lead-btn"
              >
                SCAN
              </v-btn>
            </div>
          </v-form>

          <v-alert
            v-if="auditError"
            type="error"
            variant="tonal"
            class="mt-4"
            closable
            @click:close="auditError = ''"
          >
            {{ auditError }}
          </v-alert>

          <!-- Result -->
          <div v-if="auditResult" class="audit-result">
            <div class="audit-detected">
              <v-icon color="#00FF41" size="20" class="mr-2">mdi-check-circle</v-icon>
              <span>
                Price detected:
                <strong class="green">{{ formatCurrency(auditResult.price, auditResult.currency) }}</strong>
                on <strong>{{ auditResult.domain }}</strong>
              </span>
            </div>

            <div class="audit-alert">
              <div class="audit-alert-icon">!</div>
              <div>
                Based on market analysis, products at this price point typically have
                <strong>{{ auditResult.inefficiencyPercent }}% pricing inefficiency</strong>.
                That's an estimated
                <strong class="amber">${{ auditResult.potentialMonthlyRecovery.toLocaleString() }}/mo</strong>
                in recoverable margin.
              </div>
            </div>

            <div v-if="!emailSubmitted" class="email-capture">
              <p class="email-label">Enter your email for the full competitive analysis report:</p>
              <v-form ref="emailFormRef" @submit.prevent="submitEmail">
                <div class="lead-form-row">
                  <v-text-field
                    v-model="email"
                    label="Email"
                    type="email"
                    :rules="[rules.required, rules.email]"
                    variant="outlined"
                    bg-color="#111"
                    base-color="#444"
                    color="#00FF41"
                    hide-details="auto"
                    density="comfortable"
                    class="lead-input"
                  />
                  <v-btn
                    type="submit"
                    color="#F2A900"
                    size="large"
                    class="text-black lead-btn"
                  >
                    GET REPORT
                  </v-btn>
                </div>
              </v-form>
            </div>

            <div v-else class="email-success">
              <v-icon color="#00FF41" size="20" class="mr-2">mdi-email-check</v-icon>
              Report queued for <strong>{{ email }}</strong>. Check your inbox shortly.
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
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@pricy/shared';
import api from '@/services/api';

const authStore = useAuthStore();

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

// ─── Lead Magnet ───
const auditFormRef = ref(null);
const emailFormRef = ref(null);
const auditUrl = ref('');
const auditLoading = ref(false);
const auditError = ref('');
const auditResult = ref(null);
const email = ref('');
const emailSubmitted = ref(false);

const rules = {
  required: v => !!v || 'Required',
  url: v => {
    try {
      const u = new URL(v);
      return (u.protocol === 'http:' || u.protocol === 'https:') || 'Enter a valid URL';
    } catch {
      return 'Enter a valid URL';
    }
  },
  email: v => /.+@.+\..+/.test(v) || 'Enter a valid email'
};

async function runAudit() {
  const { valid } = await auditFormRef.value.validate();
  if (!valid) return;

  auditLoading.value = true;
  auditError.value = '';
  auditResult.value = null;

  try {
    const { data } = await api.auditPrice({ url: auditUrl.value });
    auditResult.value = data;
  } catch (err) {
    auditError.value =
      err.response?.data?.error?.message ||
      'Could not scrape that URL. Please check it and try again.';
  } finally {
    auditLoading.value = false;
  }
}

async function submitEmail() {
  const { valid } = await emailFormRef.value.validate();
  if (!valid) return;
  emailSubmitted.value = true;
}

function formatCurrency(amount, currency) {
  return formatPrice(amount, currency || 'USD');
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
</script>

<style scoped>
/* ─── Foundation ─── */
.landing {
  --bg: #0D0D0D;
  --bg2: #141414;
  --bg3: #1a1a1a;
  --green: #00FF41;
  --amber: #F2A900;
  --white: #FFFFFF;
  --grey: #888;
  --border: #2a2a2a;

  background: var(--bg);
  color: var(--white);
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}
.green { color: var(--green); }
.amber { color: var(--amber); }

/* ─── Nav ─── */
.lnav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(13,13,13,.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.lnav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.lnav-logo {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--green);
  text-decoration: none;
  letter-spacing: 2px;
}
.lnav-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ─── Hero ─── */
.hero {
  padding: 160px 24px 100px;
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
  max-width: 700px;
}
.lead-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
}
.lead-form-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.lead-input {
  flex: 1;
}
.lead-btn {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  letter-spacing: 1px;
  min-width: 120px;
  height: 48px !important;
}

.audit-result {
  margin-top: 24px;
}
.audit-detected {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: rgba(0,255,65,.06);
  border: 1px solid rgba(0,255,65,.15);
  border-radius: 8px;
  font-size: 0.9rem;
}
.audit-alert {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-top: 16px;
  padding: 16px;
  background: rgba(242,169,0,.06);
  border: 1px solid rgba(242,169,0,.2);
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #ddd;
}
.audit-alert-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--amber);
  color: #000;
  font-weight: 800;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.email-capture {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.email-label {
  font-size: 0.85rem;
  color: var(--grey);
  margin-bottom: 12px;
}
.email-success {
  margin-top: 20px;
  padding: 14px 16px;
  background: rgba(0,255,65,.06);
  border: 1px solid rgba(0,255,65,.15);
  border-radius: 8px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
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
