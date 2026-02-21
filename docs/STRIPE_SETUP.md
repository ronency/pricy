# Stripe Setup Instructions for Pricera.io

Step-by-step guide to configure Stripe for Pricera's subscription billing.

---

## 1. Create a Stripe Account

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) and sign up
2. Verify your email address
3. You'll start in **Test Mode** (toggle in the top-right of the dashboard) — stay in test mode for development

---

## 2. Get Your API Keys

1. Go to **Developers > API keys** (or [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys))
2. Copy these two keys:
   - **Publishable key** — starts with `pk_test_...` (used in the frontend)
   - **Secret key** — starts with `sk_test_...` (used in the backend, keep secret)
3. Add them to your `api/.env`:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
```

And to `web/.env`:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 3. Create Products and Prices

Go to **Product catalog** in the Stripe Dashboard ([dashboard.stripe.com/test/products](https://dashboard.stripe.com/test/products)) and create 3 products:

### Product 1: Starter

1. Click **+ Add product**
2. **Name:** `Starter`
3. **Description:** `50 products, 3 competitors per product, daily price checks`
4. Under **Price information**, add two prices:
   - **Price 1:** $49.00 USD, Recurring, **Monthly**
   - **Price 2:** $39.00 USD, Recurring, **Yearly** (click "Add another price")
5. Click **Save product**

### Product 2: Pro

1. Click **+ Add product**
2. **Name:** `Pro`
3. **Description:** `250 products, 5 competitors per product, hourly checks, webhooks, advanced rules`
4. Under **Price information**, add two prices:
   - **Price 1:** $149.00 USD, Recurring, **Monthly**
   - **Price 2:** $119.00 USD, Recurring, **Yearly**
5. Click **Save product**

### Product 3: Advanced

1. Click **+ Add product**
2. **Name:** `Advanced`
3. **Description:** `1000+ products, 5 competitors per product, hourly checks, webhooks, advanced rules, priority support`
4. Under **Price information**, add two prices:
   - **Price 1:** $299.00 USD, Recurring, **Monthly**
   - **Price 2:** $239.00 USD, Recurring, **Yearly**
5. Click **Save product**

### Copy the Price IDs

After creating each product, click into it and copy each price's ID (starts with `price_`). You'll need 6 IDs total:

```env
# Add to api/.env
STRIPE_PRICE_STARTER_MONTHLY=price_xxxxxxxx
STRIPE_PRICE_STARTER_YEARLY=price_xxxxxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxx
STRIPE_PRICE_ADVANCED_MONTHLY=price_xxxxxxxx
STRIPE_PRICE_ADVANCED_YEARLY=price_xxxxxxxx
```

To find each price ID: click on the product, then under "Pricing", each price row shows its ID (or click the price row and copy from the detail page).

---

## 4. Configure the Customer Portal

The Customer Portal lets users self-manage their subscription (upgrade, downgrade, cancel, update payment method).

1. Go to **Settings > Billing > Customer portal** ([dashboard.stripe.com/test/settings/billing/portal](https://dashboard.stripe.com/test/settings/billing/portal))
2. Configure these sections:

### Payment methods
- Enable: **Allow customers to update payment methods** ✓

### Subscriptions > Cancellations
- Enable: **Allow customers to cancel subscriptions** ✓
- Cancellation mode: **Cancel at end of billing period** (recommended — gives you time to win them back)
- Optionally enable **Collect a cancellation reason** ✓

### Subscriptions > Plan changes
- Enable: **Allow customers to switch plans** ✓
- **Proration behavior:** Create prorations
- Under **Products**, add all 3 products (Starter, Pro, Advanced) and for each, select both the monthly and yearly prices
- This tells the portal which prices a customer can switch between

### Invoice history
- Enable: **Show invoice history** ✓

### Business information
- Set your **Headline** to something like: `Manage your Pricera.io subscription`
- Set your **Return URL** to: `http://localhost:7001/settings` (update for production)

3. Click **Save**

---

## 5. Set Up Webhooks

Webhooks let Stripe notify your backend when subscription events happen (payment succeeded, plan changed, subscription canceled, etc.).

### For Local Development (Stripe CLI)

1. Install the Stripe CLI:
   - **Windows:** `winget install Stripe.StripeCLI` or download from [stripe.com/docs/stripe-cli](https://docs.stripe.com/stripe-cli)
   - **macOS:** `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login` (opens browser for authentication)
3. Forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:7000/api/webhooks/stripe
```

4. The CLI will print a webhook signing secret (starts with `whsec_...`). Add it to `api/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

> Keep the `stripe listen` command running in a terminal while developing.

### For Production

1. Go to **Developers > Webhooks** ([dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks))
2. Click **+ Add endpoint**
3. **Endpoint URL:** `https://your-domain.com/api/webhooks/stripe`
4. **Select events to listen to** — add these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** from the endpoint detail page and set `STRIPE_WEBHOOK_SECRET` in your production environment

---

## 6. Complete Environment Variables

Your final `api/.env` should include all of these Stripe-related variables:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Price IDs (from Product Catalog)
STRIPE_PRICE_STARTER_MONTHLY=price_xxxxxxxx
STRIPE_PRICE_STARTER_YEARLY=price_xxxxxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxx
STRIPE_PRICE_ADVANCED_MONTHLY=price_xxxxxxxx
STRIPE_PRICE_ADVANCED_YEARLY=price_xxxxxxxx
```

Your `web/.env`:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 7. Testing with Stripe Test Cards

When testing checkout in test mode, use these card numbers:

| Scenario | Card Number | Expiry | CVC |
|----------|-------------|--------|-----|
| Successful payment | `4242 4242 4242 4242` | Any future date | Any 3 digits |
| Requires authentication (3D Secure) | `4000 0025 0000 3155` | Any future | Any |
| Declined card | `4000 0000 0000 0002` | Any future | Any |
| Insufficient funds | `4000 0000 0000 9995` | Any future | Any |

Use any name, address, and email.

---

## 8. Going Live (Production)

When ready to accept real payments:

1. Complete your Stripe account activation at **Settings > Account details**
2. Submit required business verification documents
3. Toggle from **Test mode** to **Live mode** in the dashboard
4. Create the same 3 products + 6 prices in live mode (or use Stripe's product cloning)
5. Get your live API keys from **Developers > API keys** (they start with `pk_live_` and `sk_live_`)
6. Create a live webhook endpoint pointing to your production URL
7. Update all environment variables in your production deployment with live keys and price IDs

> Products and prices in test mode are completely separate from live mode. You must create them in both.
