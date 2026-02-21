import { stripe, getPlanFromPriceId, PRICE_TO_PLAN } from '../config/stripe.js';
import { UserModel } from '../config/userSchema.js';
import { PlanLimits } from '@pricy/shared';

/**
 * POST /api/webhooks/stripe
 * Stripe sends events here. Raw body required for signature verification.
 */
export async function handleStripeWebhook(req, res) {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreatedOrUpdated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionCreatedOrUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error(`Error handling Stripe event ${event.type}:`, err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleCheckoutCompleted(session) {
  if (session.mode !== 'subscription') return;

  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('checkout.session.completed: no userId in metadata');
    return;
  }

  const subscriptionId = session.subscription;
  const customerId = session.customer;

  // Fetch the subscription to get price details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = getPlanFromPriceId(priceId);

  if (!plan) {
    console.error(`checkout.session.completed: unknown priceId ${priceId}`);
    return;
  }

  await UserModel.findByIdAndUpdate(userId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeSubscriptionStatus: subscription.status,
    stripePriceId: priceId,
    stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
    plan,
    planLimits: PlanLimits[plan]
  });

  console.log(`Checkout completed: user ${userId} subscribed to ${plan}`);
}

async function handleSubscriptionCreatedOrUpdated(subscription) {
  const user = await UserModel.findOne({ stripeCustomerId: subscription.customer });
  if (!user) {
    console.error(`Subscription event: no user found for customer ${subscription.customer}`);
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const plan = getPlanFromPriceId(priceId);

  const update = {
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status,
    stripePriceId: priceId,
    stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    stripeCancelAtPeriodEnd: subscription.cancel_at_period_end
  };

  // Only update plan if we recognize the price and the subscription is active
  if (plan && subscription.status === 'active') {
    update.plan = plan;
    update.planLimits = PlanLimits[plan];
  }

  await UserModel.findByIdAndUpdate(user._id, update);
  console.log(`Subscription ${subscription.status}: user ${user._id} -> ${plan || 'unknown'}`);
}

async function handleSubscriptionDeleted(subscription) {
  const user = await UserModel.findOne({ stripeCustomerId: subscription.customer });
  if (!user) {
    console.error(`Subscription deleted: no user found for customer ${subscription.customer}`);
    return;
  }

  await UserModel.findByIdAndUpdate(user._id, {
    stripeSubscriptionStatus: 'canceled',
    stripePriceId: null,
    stripeCurrentPeriodEnd: null,
    stripeCancelAtPeriodEnd: false,
    plan: 'free',
    planLimits: PlanLimits.free
  });

  console.log(`Subscription deleted: user ${user._id} reverted to free`);
}

async function handleInvoicePaid(invoice) {
  if (!invoice.subscription) return;

  const user = await UserModel.findOne({ stripeCustomerId: invoice.customer });
  if (!user) return;

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);

  await UserModel.findByIdAndUpdate(user._id, {
    stripeSubscriptionStatus: 'active',
    stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000)
  });

  console.log(`Invoice paid: user ${user._id} period extended`);
}

async function handleInvoicePaymentFailed(invoice) {
  if (!invoice.subscription) return;

  const user = await UserModel.findOne({ stripeCustomerId: invoice.customer });
  if (!user) return;

  await UserModel.findByIdAndUpdate(user._id, {
    stripeSubscriptionStatus: 'past_due'
  });

  console.log(`Invoice payment failed: user ${user._id} now past_due`);
}
