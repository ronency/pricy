# Stripe Integration — Progress Tracker

Reference: [STRIPE_INTEGRATION_PLAN.md](./STRIPE_INTEGRATION_PLAN.md)

## Phase 1 — Backend Foundation
| Step | Description | Status |
|------|-------------|--------|
| 1.1 | Install `stripe` npm package | DONE |
| 1.2 | Stripe config + price mapping (`api/src/config/stripe.js`) | DONE |
| 1.3 | Add Stripe fields to User schema + `toClient()` | DONE |
| 1.4 | Update shared User model | DONE |
| 1.5 | Stripe webhook endpoint + controller | DONE |
| 1.6 | Update .env.example | DONE |

## Phase 2 — Checkout Flow (Subscribe)
| Step | Description | Status |
|------|-------------|--------|
| 2.1 | Checkout session endpoint (`billingController`) | DONE |
| 2.2 | Mount billing routes in server.js | DONE |
| 2.3 | API client methods (`createCheckoutSession`, `createPortalSession`) | DONE |
| 2.4 | Update PricingView to trigger checkout | DONE |
| 2.5 | Frontend Stripe price config + `web/.env.example` | DONE |

## Phase 3 — Portal Flow (Manage / Upgrade / Downgrade / Cancel)
| Step | Description | Status |
|------|-------------|--------|
| 3.1 | Portal session endpoint | DONE (in billingController) |
| 3.2 | API client method (`createPortalSession`) | DONE |
| 3.3 | Update SettingsView — billing section | DONE |
| 3.4 | Portal upgrade/downgrade/cancel (handled by Stripe + webhooks) | DONE (via webhook handler) |

## Phase 4 — Access Control & Edge Cases
| Step | Description | Status |
|------|-------------|--------|
| 4.1 | Subscription-aware plan limits middleware | DONE |
| 4.2 | Past-due warning banner | DONE |
| 4.3 | Handle checkout=success on Settings page | DONE |
| 4.4 | Prevent duplicate subscriptions | DONE (in billingController) |
| 4.5 | Plan downgrade data handling | DONE (existing middleware) |
| 4.6 | Over-limit product resolution after downgrade | TODO (later) |

## Phase 5 — Polish & Production Readiness
| Step | Description | Status |
|------|-------------|--------|
| 5.1 | Update PricingView for logged-in users | DONE (dynamic CTAs in Phase 2) |
| 5.2 | Update admin panel — subscription status column | DONE |
| 5.3 | Update .env.example files (api + web) | DONE |
| 5.4 | Daily Stripe reconciliation job | DONE |
| 5.5 | Security checklist | DONE (all items implemented in code) |
