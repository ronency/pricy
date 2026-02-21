# Plan: Replace Stripe Portal with In-House Billing Management

## Context
Currently, logged-in subscribers who click "Manage Billing" are redirected to Stripe's hosted Customer Portal to upgrade, downgrade, cancel, or update payment. This takes users off-site. The goal is to handle all billing actions within pricera.io, with the only Stripe redirect being for credit card entry (initial checkout + payment method update).

## What Replaces the Portal

| Action | Current (portal) | New (in-house) |
|--------|------------------|----------------|
| Upgrade plan | Portal | Plan picker dialog in SettingsView → `stripe.subscriptions.update()` |
| Downgrade plan | Portal | Same dialog → Stripe Subscription Schedules (deferred to period end) |
| Switch interval | Portal | Same dialog → upgrade or schedule logic |
| Cancel | Portal | Confirm dialog → `stripe.subscriptions.update({ cancel_at_period_end })` |
| Resubscribe | Portal | Button → `stripe.subscriptions.update({ cancel_at_period_end: false })` |
| Update payment | Portal | Stripe Checkout in `setup` mode (only remaining redirect) |
| View invoices | Portal | Invoice table fetched from `stripe.invoices.list()` |

---

## Phase 1 — Backend: Expose Data + Config Helpers

### 1.1 Add `PLAN_RANK` and `getIntervalFromPriceId` to stripe config
**File:** `api/src/config/stripe.js`
```js
export const PLAN_RANK = { free: 0, starter: 1, pro: 2, advanced: 3 };
export function getIntervalFromPriceId(priceId) {
  return PRICE_TO_PLAN[priceId]?.interval || null;
}
```

### 1.2 Expose `stripePriceId` to client
**File:** `api/src/config/userSchema.js` — add `stripePriceId` to `toClient()`
**File:** `shared/src/models/User.js` — add `stripePriceId` to constructor + `toJSON()`

The frontend needs this to know the current billing interval and detect "same plan" selections.

---

## Phase 2 — Backend: New Billing Endpoints

All in **`api/src/controllers/billingController.js`** (existing file, add new exports).
Wire routes in **`api/src/routes/billingRoutes.js`**.

### 2.1 `GET /api/billing/subscription`
Returns current subscription details including payment method info.

**Stripe call:** `stripe.subscriptions.retrieve(subId, { expand: ['default_payment_method'] })`

**Response:**
```json
{
  "subscription": {
    "plan": "pro",
    "status": "active",
    "interval": "month",
    "currentPeriodEnd": "2026-03-15T...",
    "cancelAtPeriodEnd": false,
    "paymentMethod": { "brand": "visa", "last4": "4242", "expMonth": 12, "expYear": 2027 }
  }
}
```
Returns `{ "subscription": null }` for free users.

Also check for pending downgrade: `stripe.subscriptionSchedules.list({ subscription: subId, limit: 1 })` — if a schedule exists, include `pendingPlan` and `pendingInterval` in the response.

### 2.2 `POST /api/billing/change-plan`
**Request:** `{ "priceId": "price_yyy" }`

**Logic:**
1. Validate `priceId` in `PRICE_TO_PLAN`, reject same price as current
2. Block if `stripeSubscriptionStatus === 'past_due'` (must fix payment first)
3. If user has `cancel_at_period_end: true`, clear it first
4. Cancel any existing subscription schedule (pending downgrade)
5. Determine direction using `PLAN_RANK`:

**Upgrade** (higher rank, or same rank monthly→yearly):
```js
stripe.subscriptions.update(subId, {
  items: [{ id: itemId, price: priceId }],
  proration_behavior: 'always_invoice',
  payment_behavior: 'error_if_incomplete'
})
```
Returns `{ status: 'updated', effective: 'immediately', plan, interval }`

**Downgrade** (lower rank, or same rank yearly→monthly):
```js
const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subId });
await stripe.subscriptionSchedules.update(schedule.id, {
  end_behavior: 'release',
  phases: [
    { items: [{ price: currentPriceId, quantity: 1 }], start_date: phase0.start_date, end_date: phase0.end_date },
    { items: [{ price: newPriceId, quantity: 1 }] }
  ]
});
```
Returns `{ status: 'scheduled', effective: 'at_period_end', plan, interval }`

### 2.3 `POST /api/billing/cancel`
```js
stripe.subscriptions.update(subId, { cancel_at_period_end: true })
```
Returns `{ status: 'canceling', cancelAt: periodEnd }`

### 2.4 `POST /api/billing/resubscribe`
Only allowed when `status === 'active'` and `cancelAtPeriodEnd === true`.
```js
stripe.subscriptions.update(subId, { cancel_at_period_end: false })
```
Returns `{ status: 'active' }`

### 2.5 `POST /api/billing/update-payment-method`
Creates Stripe Checkout in `setup` mode:
```js
stripe.checkout.sessions.create({
  mode: 'setup',
  customer: user.stripeCustomerId,
  payment_method_types: ['card'],
  success_url: `${FRONTEND_URL}/settings?payment_updated=success`,
  cancel_url: `${FRONTEND_URL}/settings`
})
```
Returns `{ checkoutUrl: session.url }`

### 2.6 `GET /api/billing/invoices`
**Query params:** `?limit=10&starting_after=in_xxx`
```js
stripe.invoices.list({ customer: customerId, limit, starting_after, status: 'paid' })
```
Returns `{ invoices: [{ id, date, amount, currency, status, pdfUrl, hostedUrl }], hasMore }`

---

## Phase 3 — Backend: Webhook for Payment Method Update

**File:** `api/src/controllers/stripeWebhookController.js`

Add handler for `setup_intent.succeeded`:
```js
case 'setup_intent.succeeded':
  // Get new payment method from setup intent
  // Set as default on customer: stripe.customers.update(customerId, { invoice_settings: { default_payment_method } })
  // Set as default on subscription: stripe.subscriptions.update(subId, { default_payment_method })
```

Also add `subscription_schedule.completed` / `subscription_schedule.released` for logging (the existing `subscription.updated` handler already picks up the plan change when a schedule phase transitions).

---

## Phase 4 — Frontend: API Methods + Config

### 4.1 API service methods
**File:** `web/src/services/api.js` — add:
- `getSubscription()` → GET /billing/subscription
- `changePlan(priceId)` → POST /billing/change-plan
- `cancelSubscription()` → POST /billing/cancel
- `resubscribe()` → POST /billing/resubscribe
- `updatePaymentMethod()` → POST /billing/update-payment-method
- `getInvoices(params)` → GET /billing/invoices

### 4.2 Frontend stripe config
**File:** `web/src/config/stripe.js` — add:
- `PRICE_TO_PLAN` reverse map (priceId → { plan, interval })
- `PLAN_RANK` object for upgrade/downgrade detection

---

## Phase 5 — Frontend: SettingsView Billing Overhaul

**File:** `web/src/views/SettingsView.vue`

Replace the current simple billing card with:

### Current Plan Section
- Plan name + status chip (keep existing)
- Billing interval badge: "Monthly" / "Yearly" (derived from `stripePriceId`)
- Next renewal: formatted `stripeCurrentPeriodEnd`
- Pending downgrade notice if schedule exists: "Switching to {plan} on {date}"
- Plan limits list (keep existing)
- Cancel/past-due warnings (keep existing)

### Action Buttons
- **Change Plan** → opens plan picker dialog
- **Update Payment Method** → Stripe Checkout setup redirect
- **Cancel Subscription** / **Resubscribe** (contextual)

### Payment Method Display
- "Visa ending in 4242, expires 12/27" (from `getSubscription` response)
- [Update] button

### Change Plan Dialog (`v-dialog`, max-width 700px)
- Monthly/Yearly toggle (v-btn-toggle)
- 3 plan cards (Starter, Pro, Advanced) — current plan marked, selected highlighted
- Proration notice:
  - Upgrade: "You'll be charged a prorated amount today"
  - Downgrade: "Your plan will change to {plan} on {date}"
- [Cancel] [Confirm Change] buttons

### Cancel Confirmation Dialog (`v-dialog`, max-width 450px)
- "Your {plan} features remain active until {date}. After that, you'll be on the Free plan."
- [Keep Subscription] [Cancel Subscription]

### Invoice History
- `v-data-table`: Date | Amount | Status | PDF link
- "Load More" button if `hasMore`
- Amounts formatted as "$149.00" (cents / 100)

### New reactive state
```
subscription, invoices, loadingSubscription, loadingInvoices,
showChangePlanDialog, showCancelDialog, changingPlan, canceling,
resubscribing, selectedPriceId, selectedInterval
```

### onMounted additions
- Handle `?payment_updated=success` query param → snackbar + refresh
- Handle `?changeTo=pro&interval=month` query param → pre-open dialog (from PricingView)
- Fetch subscription + invoices for paid users

---

## Phase 6 — Frontend: PricingView Update

**File:** `web/src/views/PricingView.vue`

Change `selectPlan()` for active subscribers:
- Instead of opening Stripe Portal, navigate to `/settings?changeTo={plan}&interval={month|year}`
- Update CTA text: "Switch Plan" instead of "Manage Billing"

---

## Edge Cases
1. **Pending cancel + plan change** → clear `cancel_at_period_end` before changing
2. **Pending downgrade + new change** → cancel existing subscription schedule first
3. **Payment fails on upgrade** → `payment_behavior: 'error_if_incomplete'` throws → return 402
4. **Past-due user tries to change plan** → block with "resolve payment first"
5. **Free user clicks Change Plan** → redirect to PricingView (checkout flow)
6. **Annual→monthly same tier** → treated as downgrade (deferred)
7. **Monthly→annual same tier** → treated as upgrade (immediate with proration credit)

## Files Modified
| File | Changes |
|------|---------|
| `api/src/config/stripe.js` | Add `PLAN_RANK`, `getIntervalFromPriceId()` |
| `api/src/config/userSchema.js` | Add `stripePriceId` to `toClient()` |
| `shared/src/models/User.js` | Add `stripePriceId` to constructor + `toJSON()` |
| `api/src/controllers/billingController.js` | Add 6 new endpoint handlers |
| `api/src/routes/billingRoutes.js` | Add 6 new routes |
| `api/src/controllers/stripeWebhookController.js` | Add `setup_intent.succeeded` handler |
| `web/src/services/api.js` | Add 6 new API methods |
| `web/src/config/stripe.js` | Add `PRICE_TO_PLAN`, `PLAN_RANK` |
| `web/src/views/SettingsView.vue` | Full billing section overhaul |
| `web/src/views/PricingView.vue` | Route to settings instead of portal |

## Verification
1. Start API + web dev servers, run `stripe listen --forward-to localhost:7000/api/webhooks/stripe`
2. Subscribe via PricingView (Stripe Checkout) → verify redirect to settings with success
3. Open Change Plan dialog → select higher plan → confirm → verify immediate charge + plan update
4. Open Change Plan dialog → select lower plan → confirm → verify "scheduled" response, plan doesn't change yet
5. Cancel subscription → verify "Canceling" status, resubscribe button appears
6. Click Resubscribe → verify status returns to "Active"
7. Click Update Payment Method → verify Stripe Checkout setup redirect → return with new card shown
8. Verify invoice table shows past invoices with PDF links
