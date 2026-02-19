
# Pricy Landing Page Specification (Updated)

## 1. Visual Identity & Brand Vibe

* **Theme:** "The Dark Cockpit" (High-performance terminal-inspired UI).
* **Palette:** * Background: `#0D0D0D` (Deep Onyx).
* Primary/Data: `#00FF41` (Matrix Green - Success/Active).
* Secondary: `#FFFFFF` (Clean White - Headers).
* Accent: `#F2A900` (Amber - Alerts/Warnings).


* **Typography:** * Headers: *Inter* (Bold, high-tracking).
* Data/Logs: *JetBrains Mono* (Monospaced for that "API-first" feel).



## 2. Tech Stack Implementation

* **Frontend:** Vue 3 + Pinia (State Management) + Vuetify 3 (UI Components).
* **Backend:** Node.js + Express.
* **UI Notes:** Use Vuetify’s `v-card` with custom dark themes and `v-window` for the tabbed console animations.

## 3. Hero Section: The Conversion Engine

* **Status Badge:** Pulsing green dot using a CSS animation next to text: `[SYSTEM STATUS: OPTIMIZING MARGINS]`.
* **Headline:** "Your Competitors just changed their prices. **Did you?**".
* **Value Prop:** A headless pricing API for Shopify Power-Sellers featuring real-time tracking, rule-based logic, and instant Webhook execution.
* **CTA Button:** `v-btn` (Color: success) labeled `[RUN INSTANT PRICE AUDIT]`.

## 4. The Interactive Console (Technical Proof)

A Vuetify-based terminal window showcasing the immediate ROI and logic flow.

### Tab 1: `monitor.log` (The Scraper)

```bash
[14:20:01] GET https://competitor-a.com/product-xyz ... 200 OK
[14:20:02] Extracting: price_selector_css: ".price-item--sale"
[14:20:02] Result: $119.99 (USD)

```

### Tab 2: `analysis.engine` (The Rules)

```javascript
// Rule Engine evaluating deltas
if (competitorPrice < myPrice && margin > 0.20) {
    status: "ACTION_REQUIRED",
    suggestion: "MATCH_COMPETITOR"
}

```

### Tab 3: `webhook.out` (The Integration)

```json
{
  "event": "price_gap_detected",
  "sku": "NKE-AIR-MAX-90",
  "current_price": 125.00,
  "suggested_price": 119.94,
  "webhook_url": "https://api.yourstore.com/v1/update"
}

```

## 5. Pricing Tiers (Validated Solo-Model)

* **Free / Trial:** 5 products, 1 competitor, Daily checks, No webhooks.
* **Starter ($49/mo):** 50 products, 3 competitors, Daily checks, Email summaries.
* **Pro ($149/mo):** 250 products, 5 competitors, Hourly checks, Webhooks enabled.
* **Advanced ($299+/mo):** 1,000+ products, High-frequency checks, Custom rules.

## 6. Lead Magnet Integration

* **The "Price Leak" Tool:** A simple Vue form where a user submits their store URL.
* **Backend Logic:** Express route triggers a script to identify 3 price gaps.
* **The Conversion:** "We found $X,XXX in potential monthly profit recovery. Enter your email for the full JSON/PDF report."

---

### Pro-Tip for your Stack:

Since you are using **Vuetify**, you can use the `v-data-table` to show a "Live Comparison" between the user's current prices and the competitors' prices discovered during the "Free Audit." It will look clean, technical, and highly reliable.