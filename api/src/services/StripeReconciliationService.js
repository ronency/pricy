import { stripe, getPlanFromPriceId } from '../config/stripe.js';
import { UserModel } from '../config/userSchema.js';
import { PlanLimits } from '@pricy/shared';

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class StripeReconciliationService {
  async run() {
    if (!stripe) {
      console.log('Stripe reconciliation: skipped (Stripe not configured)');
      return { total: 0, fixed: 0, errors: 0 };
    }

    console.log('Stripe reconciliation: starting...');

    const users = await UserModel.find({
      stripeSubscriptionId: { $ne: null }
    }).select('+stripeSubscriptionId +stripeCustomerId');

    let total = 0;
    let fixed = 0;
    let errors = 0;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      for (const user of batch) {
        total++;
        try {
          const result = await this.reconcileUser(user);
          if (result) fixed++;
        } catch (err) {
          errors++;
          console.error(`Reconciliation error for user ${user._id}:`, err.message);
        }
      }

      // Delay between batches to respect Stripe rate limits
      if (i + BATCH_SIZE < users.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    const summary = `Stripe reconciliation complete: ${total} checked, ${fixed} corrected, ${errors} errors`;
    console.log(summary);
    return { total, fixed, errors };
  }

  /**
   * Reconcile a single user against Stripe.
   * Returns true if any fields were corrected.
   */
  async reconcileUser(user) {
    let subscription;

    try {
      subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    } catch (err) {
      if (err.statusCode === 404 || err.code === 'resource_missing') {
        // Subscription no longer exists in Stripe — revert to free
        await UserModel.findByIdAndUpdate(user._id, {
          stripeSubscriptionStatus: 'canceled',
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
          stripeCancelAtPeriodEnd: false,
          plan: 'free',
          planLimits: PlanLimits.free
        });
        console.log(`Reconciled user ${user._id}: subscription not found, reverted to free`);
        return true;
      }
      throw err;
    }

    const priceId = subscription.items.data[0]?.price?.id;
    const plan = getPlanFromPriceId(priceId);
    const periodEnd = new Date(subscription.current_period_end * 1000);

    const update = {};
    let needsUpdate = false;

    // Check status
    if (user.stripeSubscriptionStatus !== subscription.status) {
      update.stripeSubscriptionStatus = subscription.status;
      needsUpdate = true;
    }

    // Check price ID
    if (user.stripePriceId !== priceId) {
      update.stripePriceId = priceId;
      needsUpdate = true;
    }

    // Check period end (allow 60s tolerance)
    if (!user.stripeCurrentPeriodEnd ||
        Math.abs(user.stripeCurrentPeriodEnd.getTime() - periodEnd.getTime()) > 60000) {
      update.stripeCurrentPeriodEnd = periodEnd;
      needsUpdate = true;
    }

    // Check cancel_at_period_end
    if (user.stripeCancelAtPeriodEnd !== subscription.cancel_at_period_end) {
      update.stripeCancelAtPeriodEnd = subscription.cancel_at_period_end;
      needsUpdate = true;
    }

    // Check plan
    if (plan && subscription.status === 'active' && user.plan !== plan) {
      update.plan = plan;
      update.planLimits = PlanLimits[plan];
      needsUpdate = true;
    }

    // If subscription is canceled but user still shows active plan
    if (subscription.status === 'canceled' && user.plan !== 'free') {
      update.plan = 'free';
      update.planLimits = PlanLimits.free;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await UserModel.findByIdAndUpdate(user._id, update);
      console.log(`Reconciled user ${user._id}: updated`, Object.keys(update));
      return true;
    }

    return false;
  }
}
