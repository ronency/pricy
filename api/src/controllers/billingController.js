import { stripe, PRICE_TO_PLAN } from '../config/stripe.js';
import { UserModel } from '../config/userSchema.js';

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout session for a new subscription.
 */
export async function createCheckoutSession(req, res) {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  try {
    const { priceId } = req.body;

    if (!priceId || !PRICE_TO_PLAN[priceId]) {
      return res.status(400).json({ error: 'Invalid price ID' });
    }

    const user = await UserModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent duplicate subscriptions
    if (user.stripeSubscriptionStatus === 'active' || user.stripeSubscriptionStatus === 'past_due') {
      return res.status(400).json({
        error: 'You already have an active subscription. Use the billing portal to change plans.'
      });
    }

    // Create or reuse Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() }
      });
      customerId = customer.id;
      await UserModel.findByIdAndUpdate(user._id, { stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/settings?checkout=success`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?checkout=canceled`,
      subscription_data: {
        metadata: { userId: user._id.toString() }
      },
      metadata: { userId: user._id.toString() }
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session for managing an existing subscription.
 */
export async function createPortalSession(req, res) {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  try {
    const user = await UserModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No billing account found. Subscribe to a plan first.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/settings`
    });

    res.json({ portalUrl: session.url });
  } catch (err) {
    console.error('Error creating portal session:', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
}
