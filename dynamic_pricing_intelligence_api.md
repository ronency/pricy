# Dynamic Pricing Intelligence API (Shopify-first)

## 1. Overview
An API-first service that monitors competitor pricing for selected products, detects actionable changes, and delivers automated insights via API, webhooks, and scheduled summaries. Built for fast ROI, low operational touch, and strong stickiness.

Primary value proposition:
> “We identified price gaps that could increase your margin or conversion this week.”

## 2. Core Principles
- Server-side only (REST API)
- Shopify-first, expandable to other platforms
- Fully automated after setup
- Clear monetary ROI
- Minimal UI (docs, onboarding, rules config)
- API marketplace–friendly (RapidAPI)

## 3. High-Level Architecture
- Shopify OAuth + Product Sync
- Pricing Intelligence API
- Competitor Price Collection Layer
- Rule Engine
- Notification Layer (Webhooks + Email)
- Optional Chrome Extension (assistive, not required)

## 4. User Flow (Phase 1 – Manual Product Definition)
1. Merchant installs app / gets API key
2. Product catalog is synced from Shopify
3. Merchant manually selects products to track
4. Merchant manually adds competitor product URLs
5. System monitors prices on schedule
6. Rule engine evaluates deltas
7. Events pushed via:
   - Webhooks (real-time)
   - Scheduled email summaries
   - API polling endpoints

## 5. Chrome Extension (Optional Accelerator)
Purpose: reduce setup friction.

Capabilities:
- “Add competitor product” from any product page
- Auto-detect product title, price, currency
- Associate competitor URL with Shopify product
- Quick rule presets (match price, stay X% lower, etc.)

Extension talks only to:
POST /competitors
POST /products/{id}/competitors

## 6. Core API Endpoints (High-Level)

### Authentication
POST /auth/api-key
POST /auth/shopify/oauth

### Products
GET /products
POST /products/track
DELETE /products/{id}

### Competitors
POST /competitors
GET /competitors?product_id=
DELETE /competitors/{id}

### Pricing Data
GET /prices/latest
GET /prices/history

### Rules
POST /rules
GET /rules
PUT /rules/{id}

### Events & Notifications
POST /webhooks
GET /events
GET /summaries/weekly

## 7. Rule Engine (Examples)
- Alert if competitor price < mine by X%
- Alert if competitor drops price by Y% within Z hours
- Notify only if margin impact > $N
- Weekly summary of top 5 threats & opportunities

## 8. Pricing Model (Estimation)

### Free / Trial
- 5 products
- 1 competitor per product
- Daily checks
- No webhooks

### Starter ($29–49/mo)
- 50 products
- 3 competitors per product
- Daily checks
- Email summaries

### Pro ($99–149/mo)
- 250 products
- 5 competitors per product
- Hourly checks
- Webhooks
- Advanced rules

### Advanced ($299+/mo)
- 1,000+ products
- High-frequency checks
- Custom rules
- Priority processing

## 9. Development Effort (Rough)
- Shopify integration: 1–1.5 weeks
- Core API + DB: 2 weeks
- Scraping / pricing collectors: 1–2 weeks
- Rules + notifications: 1 week
- Chrome extension (optional): 1 week
Total MVP: ~5–7 weeks

## 10. Expansion Paths
- Automatic competitor discovery
- MAP / MSRP enforcement
- Multi-market currency normalization
- Other platforms (WooCommerce, Amazon, Etsy)

---

Status: MVP-ready blueprint
