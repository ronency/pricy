# Stripe Integration Plan — Pricera.io

## Overview

Integrate Stripe Checkout + Customer Portal to handle paid subscriptions for the 3 paid plans (Starter, Pro, Advanced), each with monthly and yearly pricing. The free plan has no subscription.

### Key Decisions

- **Stripe Checkout** (hosted) for new subscriptions — no custom payment form needed
- **Stripe Customer Portal** (hosted) for managing existing subscriptions — upgrade, downgrade, cancel, update payment method, view invoices
- **Webhooks** as the source of truth for subscription state — never rely solely on redirect callbacks
- **No free trial** — the free plan serves as the trial (users can experiment as long as they want)
- **Proration** on upgrades (charge immediately), downgrades take effect at period end
- **30-day refund policy on yearly subscriptions** — users can cancel within the first 30 days and receive a prorated refund, no questions asked

### Subscription Lifecycle Scenarios

| Scenario | Flow |
|----------|------|
| **New subscription** | User clicks plan on Pricing page -> backend creates Checkout Session -> redirect to Stripe Checkout -> user pays -> webhook updates DB -> user lands on success page |
| **Upgrade** (e.g., Starter -> Pro) | User clicks "Manage Billing" in Settings -> Stripe Portal -> selects higher plan -> prorated charge is created immediately -> webhook updates DB plan + limits |
| **Downgrade** (e.g., Pro -> Starter) | Same portal flow -> downgrade scheduled for end of billing period -> `cancel_at_period_end`-like behavior -> webhook fires at period end with new plan |
| **Switch billing interval** (monthly <-> yearly) | Portal flow -> treated like a plan change with proration |
| **Cancel** | Portal -> cancel at period end -> access continues until `current_period_end` -> webhook sets plan to free |
| **Resubscribe after cancel** | If within current period (cancel_at_period_end=true), portal can undo. Otherwise, new Checkout session |
| **Payment failure** | Stripe retries (Smart Retries, up to 4 attempts over ~3 weeks) -> `invoice.payment_failed` webhook -> status moves to `past_due` -> after exhausting retries, subscription canceled -> plan reverts to free |
| **Yearly refund** (within 30 days) | User contacts support or clicks refund button -> backend checks subscription is yearly and `created` < 30 days ago -> issues prorated refund via `stripe.refunds.create()` and cancels subscription -> plan reverts to free |

---

## Phase 1 — Backend Foundation

**Goal:** Install Stripe SDK, add schema fields, create the price mapping config, set up the Stripe webhook endpoint.

### 1.1 Install `stripe` npm package

**File:** `api/package.json`

```bash
cd api && npm install stripe
```

### 1.2 Stripe config + price mapping

**File:** `api/src/config/stripe.js` (new)

Centralizes all Stripe configuration:
- Initialize `Stripe` instance with `STRIPE_SECRET_KEY`
- Export a `PRICE_TO_PLAN` map: `{ [priceId]: { plan: 'starter'|'pro'|'advanced', interval: 'month'|'year' } }`
- Export a `PLAN_TO_PRICES` reverse map: `{ starter: { month: priceId, year: priceId }, ... }`
- Both maps are built from `STRIPE_PRICE_*` env vars
- Export a helper `getPlanFromPriceId(priceId)` that returns the plan name

### 1.3 Add Stripe fields to User schema

**File:** `api/src/config/userSchema.js`

Add these fields:

```js
stripeCustomerId:         { type: String, index: true, unique: true, sparse: true },
stripeSubscriptionId:     { type: String, index: true, sparse: true },
stripeSubscriptionStatus: { type: String, default: null },  // 'active', 'past_due', 'canceled', etc.
stripePriceId:            { type: String, default: null },
stripeCurrentPeriodEnd:   { type: Date, default: null },
stripeCancelAtPeriodEnd:  { type: Boolean, default: false },
```

Update `toClient()` to expose: `stripeSubscriptionStatus`, `stripeCurrentPeriodEnd`, `stripeCancelAtPeriodEnd` (never expose the raw Stripe IDs to the client).

### 1.4 Update shared User model

**File:** `shared/src/models/User.js`

Add the same subscription-status fields to the `User` class constructor and `toJSON()` so the frontend can read them.

### 1.5 Stripe webhook endpoint

**File:** `api/src/routes/stripeWebhookRoutes.js` (new)
**File:** `api/src/controllers/stripeWebhookController.js` (new)

The webhook route MUST use `express.raw()` (not `express.json()`) for signature verification.

**Mount in server.js BEFORE `express.json()` middleware:**

```js
// Must be before express.json() since it needs raw body
app.use('/api/webhooks/stripe', stripeWebhookRoutes);

// Then the rest
app.use(express.json());
```

**Webhook handler** — process these events:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Look up user via `metadata.userId`, store `stripeCustomerId` + `stripeSubscriptionId`, set plan + planLimits |
| `customer.subscription.created` | Update subscription fields (status, priceId, periodEnd) |
| `customer.subscription.updated` | Update plan (if price changed), update status, handle `cancel_at_period_end` |
| `customer.subscription.deleted` | Set plan to `'free'`, planLimits to `PlanLimits.free`, clear subscription fields |
| `invoice.paid` | Update `stripeCurrentPeriodEnd` from invoice period, confirm `active` status |
| `invoice.payment_failed` | Update status to `past_due` (access continues for now but user is warned) |

Each handler finds the user by `stripeCustomerId` (or `metadata.userId` for checkout.session.completed) and updates the DB.

### 1.6 Update .env.example

**File:** `api/.env.example`

Add all `STRIPE_*` variables with placeholder values.

---

## Phase 2 — Checkout Flow (Subscribe)

**Goal:** Users can subscribe to a paid plan from the Pricing page via Stripe Checkout.

### 2.1 Checkout session endpoint

**File:** `api/src/controllers/billingController.js` (new)
**File:** `api/src/routes/billingRoutes.js` (new)

**`POST /api/billing/checkout`** (authenticated)

Request body: `{ priceId: "price_xxx" }`

Logic:
1. Validate `priceId` exists in `PRICE_TO_PLAN` map
2. If user already has an active subscription, return 400 — they should use the portal to change plans
3. If user doesn't have a `stripeCustomerId`, create a Stripe customer (`stripe.customers.create({ email, name, metadata: { userId } })`) and store it on the user
4. Create a Checkout Session:
   ```js
   stripe.checkout.sessions.create({
     mode: 'subscription',
     customer: user.stripeCustomerId,
     line_items: [{ price: priceId, quantity: 1 }],
     success_url: `${FRONTEND_URL}/settings?checkout=success`,
     cancel_url: `${FRONTEND_URL}/pricing?checkout=canceled`,
     subscription_data: {
       metadata: { userId: user._id.toString() }
     },
     metadata: { userId: user._id.toString() }
   })
   ```
5. Return `{ checkoutUrl: session.url }`

### 2.2 Mount billing routes

**File:** `api/src/server.js`

```js
app.use('/api/billing', billingRoutes);
```

### 2.3 API client method

**File:** `web/src/services/api.js`

```js
createCheckoutSession(priceId) {
  return apiClient.post('/billing/checkout', { priceId });
}
```

### 2.4 Update PricingView to trigger checkout

**File:** `web/src/views/PricingView.vue`

Replace the `selectPlan()` stub:
- For logged-in users: call `api.createCheckoutSession(priceId)` then redirect to `checkoutUrl`
- For logged-out users: redirect to `/signup?plan=<key>&interval=<month|year>` — after signup, auto-redirect to checkout

Update plan card buttons to pass the correct `priceId` based on the annual/monthly toggle.

### 2.5 Add Stripe price config to frontend

**File:** `web/src/config/stripe.js` (new)

Map plan keys to their Stripe price IDs (read from `import.meta.env`):

```js
export const PLAN_PRICES = {
  starter: { month: import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY, year: ... },
  pro:     { month: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY, year: ... },
  advanced: { month: import.meta.env.VITE_STRIPE_PRICE_ADVANCED_MONTHLY, year: ... },
}
```

Update `web/.env` and `web/.env.example` with all 6 `VITE_STRIPE_PRICE_*` vars.

---

## Phase 3 — Portal Flow (Manage / Upgrade / Downgrade / Cancel)

**Goal:** Existing subscribers can manage their subscription via the Stripe Customer Portal.

### 3.1 Portal session endpoint

**File:** `api/src/controllers/billingController.js`

**`POST /api/billing/portal`** (authenticated)

Logic:
1. If user has no `stripeCustomerId`, return 400
2. Create a portal session:
   ```js
   stripe.billingPortal.sessions.create({
     customer: user.stripeCustomerId,
     return_url: `${FRONTEND_URL}/settings`
   })
   ```
3. Return `{ portalUrl: session.url }`

### 3.2 API client method

**File:** `web/src/services/api.js`

```js
createPortalSession() {
  return apiClient.post('/billing/portal');
}
```

### 3.3 Update SettingsView — billing section

**File:** `web/src/views/SettingsView.vue`

Replace the read-only "Plan Details" card with a richer billing card:

- Show current plan name + badge
- Show billing interval (monthly/yearly)
- Show subscription status with colored chip: `active` (green), `past_due` (orange), `canceled` (red)
- If `cancel_at_period_end`: show "Cancels on {date}" with option to resubscribe
- If yearly subscription within first 30 days: show "Eligible for 30-day refund" note
- If `past_due`: show warning "Payment failed — please update your payment method"
- **"Manage Billing" button** — calls `createPortalSession()` and redirects to `portalUrl`
- For free users: show "Upgrade" button linking to `/pricing`

### 3.4 How upgrade/downgrade works via the portal

Stripe handles this entirely — no custom code needed beyond the webhook handler:

**Upgrade (e.g., Starter Monthly -> Pro Monthly):**
- User selects new plan in portal
- Stripe creates prorated invoice (credits remaining Starter time, charges Pro time)
- `customer.subscription.updated` webhook fires with new `price`
- Webhook handler reads new price -> maps to plan name -> updates user `plan` + `planLimits`
- User immediately gets Pro features

**Downgrade (e.g., Pro Monthly -> Starter Monthly):**
- User selects lower plan in portal
- Portal schedules change for end of billing period (no immediate charge)
- `customer.subscription.updated` webhook fires with `schedule` or updated price at period end
- User keeps Pro features until period ends, then webhook fires again with Starter price

**Cancel:**
- User cancels in portal
- `customer.subscription.updated` fires with `cancel_at_period_end: true`
- User keeps access until `current_period_end`
- At period end, `customer.subscription.deleted` fires -> plan reverts to free

---

## Phase 4 — Access Control & Edge Cases

**Goal:** Enforce subscription state in the middleware and handle payment failures gracefully.

### 4.1 Subscription-aware plan limits middleware

**File:** `api/src/middleware/planLimits.js`

Update `checkProductLimit`, `checkCompetitorLimit`, etc. to also verify subscription is in good standing:

```js
function hasActiveSubscription(user) {
  if (user.plan === 'free') return true; // free doesn't need subscription
  return user.stripeSubscriptionStatus === 'active';
}
```

If `past_due`: allow continued access but add a response header `X-Subscription-Past-Due: true` — the frontend can show a warning banner.

If status is `canceled`, `unpaid`, or `incomplete_expired`: enforce free plan limits regardless of the `plan` field (belt-and-suspenders safeguard).

### 4.2 Past-due warning banner

**File:** `web/src/App.vue`

Add an axios response interceptor that checks for `X-Subscription-Past-Due` header and shows a persistent warning bar: "Your payment failed. Please update your payment method to keep your plan."

### 4.3 Handle "checkout=success" on Settings page

**File:** `web/src/views/SettingsView.vue`

On mount, check for `?checkout=success` query param:
- Show a success snackbar: "Subscription activated!"
- Refresh the user profile to pick up updated plan
- Clean the URL query params

### 4.4 Prevent duplicate subscriptions

**File:** `api/src/controllers/billingController.js`

In the checkout endpoint, reject if user already has `stripeSubscriptionStatus` in `['active', 'past_due']`. They should use the portal to change plans instead.

### 4.5 Plan downgrade data handling

When a user downgrades from a higher plan to a lower one, they may exceed the new plan's limits (e.g., 100 products on Starter, downgrading to Free which allows 5).

**Policy:** Existing data is preserved but the user cannot add new items beyond the limit. The plan limits middleware already handles this — it checks current count against the limit before allowing new creates.

### 4.6 Over-limit product resolution after downgrade

**TODO — implement in a later phase.**

When a downgrade causes the user to exceed their new plan's `maxProducts` limit, the user needs a way to choose which products to keep tracking. Until they resolve the overage:

- **Block new product creation** (already handled by `checkProductLimit`)
- **Show a persistent banner** on the dashboard and products page: "You have {N} tracked products but your {plan} plan allows {limit}. Please untrack {N - limit} products to regain full access."
- **Consider:** Disable price scanning for the user until they're within limits, OR only scan the N most-recently-tracked products (up to the limit), OR allow a grace period (e.g., 7 days) before restricting scans
- **Products page:** Add a bulk "untrack" action so the user can quickly select which products to stop tracking
- Same logic applies to competitors-per-product if that limit decreases on downgrade

This requires UX design decisions — parking it here so we address it deliberately.

---

## Phase 5 — Polish & Production Readiness

### 5.1 Update PricingView for logged-in users

Show the user's current plan highlighted, with "Current Plan" badge. Change CTA buttons:
- Current plan: disabled "Current Plan" button (already done)
- Higher plans: "Upgrade" button -> Checkout or Portal depending on whether they already have a subscription
- Lower plans: "Downgrade" button -> Portal

### 5.2 Update admin panel

**File:** `admin/src/views/UsersView.vue` (or equivalent)

Show Stripe subscription info for each user: subscription status, current period end, plan.

Admin plan override should still work (update plan + planLimits directly in DB), but add a note that this bypasses Stripe billing.

### 5.3 Update .env.example files

Ensure both `api/.env.example` and `web/.env.example` have all Stripe variables documented.

### 5.4 Daily Stripe reconciliation job

**File:** `api/src/services/StripeReconciliationService.js` (new)

A daily cron job that fetches all subscription data from Stripe's API and reconciles it against the local DB. This is a safety net for missed/failed webhooks, Stripe outages, or any drift between Stripe's state and ours.

**Schedule:** Once daily at 3:00 AM (via `node-cron`, already a dependency for the price check scheduler).

**Logic:**

1. Query all users who have a `stripeSubscriptionId` (i.e., all users who ever subscribed)
2. For each user, fetch the subscription from Stripe:
   ```js
   stripe.subscriptions.retrieve(user.stripeSubscriptionId)
   ```
3. Compare Stripe's state against the DB fields:
   - `subscription.status` vs `user.stripeSubscriptionStatus`
   - `subscription.items.data[0].price.id` vs `user.stripePriceId`
   - `subscription.current_period_end` vs `user.stripeCurrentPeriodEnd`
   - `subscription.cancel_at_period_end` vs `user.stripeCancelAtPeriodEnd`
   - Derived `plan` (from price ID mapping) vs `user.plan`
4. If any field differs, update the DB to match Stripe (Stripe is the source of truth)
5. **Handle deleted/canceled subscriptions:** If Stripe returns a `canceled` status but the DB still shows `active`, revert user to free plan
6. **Handle missing subscriptions:** If the Stripe API returns a 404 (subscription no longer exists), treat as canceled — set plan to free, clear subscription fields
7. Log a summary: `Reconciliation complete: {total} checked, {fixed} corrected, {errors} errors`

**Batching:** To avoid Stripe rate limits (25 read requests/sec in live mode), process users in batches of 20 with a 1-second delay between batches.

**Register in SchedulerService:**

**File:** `api/src/services/SchedulerService.js`

Add the reconciliation cron alongside the existing hourly price check:

```js
cron.schedule('0 3 * * *', () => reconciliationService.run());
```

**Admin visibility (optional):**

Expose a `GET /api/admin/reconciliation/run` endpoint to trigger manually from the admin panel, plus store the last run result (timestamp, counts) so admins can verify it's running.

### 5.5 Security checklist

- [ ] Webhook signature verification is enabled (`stripe.webhooks.constructEvent`)
- [ ] Stripe secret key is never exposed to the frontend
- [ ] Checkout session includes `metadata.userId` for reliable user mapping
- [ ] Webhook endpoint uses `express.raw()` before `express.json()`
- [ ] Price IDs are validated against the known `PRICE_TO_PLAN` map (rejects unknown price IDs)
- [ ] No subscription state decisions are made solely from redirect callbacks

---

## Files Summary

### New files
| File | Description |
|------|-------------|
| `api/src/config/stripe.js` | Stripe SDK init + price/plan mapping |
| `api/src/controllers/billingController.js` | Checkout + portal session endpoints |
| `api/src/controllers/stripeWebhookController.js` | Webhook event handler |
| `api/src/routes/billingRoutes.js` | `/api/billing/*` routes |
| `api/src/routes/stripeWebhookRoutes.js` | `/api/webhooks/stripe` route (raw body) |
| `web/src/config/stripe.js` | Frontend price ID mapping |
| `api/src/services/StripeReconciliationService.js` | Daily Stripe-to-DB sync job |
| `docs/STRIPE_SETUP.md` | Stripe dashboard setup instructions |

### Modified files
| File | Changes |
|------|---------|
| `api/package.json` | Add `stripe` dependency |
| `api/src/config/userSchema.js` | Add 6 Stripe fields, update `toClient()` |
| `api/src/server.js` | Mount webhook route (before `express.json`), mount billing routes |
| `api/.env.example` | Add all `STRIPE_*` env vars |
| `shared/src/models/User.js` | Add Stripe fields to User class |
| `web/src/services/api.js` | Add `createCheckoutSession()`, `createPortalSession()` |
| `web/src/views/PricingView.vue` | Wire up plan buttons to Checkout |
| `web/src/views/SettingsView.vue` | Add billing management section |
| `web/src/App.vue` | Add past-due warning banner |
| `web/.env.example` | Add `VITE_STRIPE_*` env vars |
| `api/src/middleware/planLimits.js` | Add subscription status checks |
| `api/src/services/SchedulerService.js` | Add daily reconciliation cron |
