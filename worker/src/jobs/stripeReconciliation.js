import { stripe, getPlanFromPriceId } from '@pricy/shared/db';
import { UserModel } from '@pricy/shared/db';
import { PlanLimits } from '@pricy/shared';
import { logger } from '../lib/logger.js';

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function defineStripeReconciliation(agenda) {
  agenda.define('stripe-reconciliation', { concurrency: 1 }, async (job) => {
    if (!stripe) {
      logger.info('Stripe reconciliation: skipped (Stripe not configured)');
      return;
    }

    logger.info('Stripe reconciliation: starting');

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
          const wasFixed = await reconcileUser(user);
          if (wasFixed) fixed++;
        } catch (err) {
          errors++;
          logger.error({ userId: user._id, err: err.message }, 'Reconciliation error');
        }
      }

      if (i + BATCH_SIZE < users.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    logger.info({ total, fixed, errors }, 'Stripe reconciliation complete');
  });
}

async function reconcileUser(user) {
  let subscription;

  try {
    subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
  } catch (err) {
    if (err.statusCode === 404 || err.code === 'resource_missing') {
      await UserModel.findByIdAndUpdate(user._id, {
        stripeSubscriptionStatus: 'canceled',
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
        stripeCancelAtPeriodEnd: false,
        plan: 'free',
        planLimits: PlanLimits.free
      });
      logger.info({ userId: user._id }, 'Subscription not found — reverted to free');
      return true;
    }
    throw err;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const plan = getPlanFromPriceId(priceId);
  const periodEnd = new Date(subscription.current_period_end * 1000);

  const update = {};
  let needsUpdate = false;

  if (user.stripeSubscriptionStatus !== subscription.status) {
    update.stripeSubscriptionStatus = subscription.status;
    needsUpdate = true;
  }

  if (user.stripePriceId !== priceId) {
    update.stripePriceId = priceId;
    needsUpdate = true;
  }

  if (!user.stripeCurrentPeriodEnd ||
      Math.abs(user.stripeCurrentPeriodEnd.getTime() - periodEnd.getTime()) > 60000) {
    update.stripeCurrentPeriodEnd = periodEnd;
    needsUpdate = true;
  }

  if (user.stripeCancelAtPeriodEnd !== subscription.cancel_at_period_end) {
    update.stripeCancelAtPeriodEnd = subscription.cancel_at_period_end;
    needsUpdate = true;
  }

  if (plan && subscription.status === 'active' && user.plan !== plan) {
    update.plan = plan;
    update.planLimits = PlanLimits[plan];
    needsUpdate = true;
  }

  if (subscription.status === 'canceled' && user.plan !== 'free') {
    update.plan = 'free';
    update.planLimits = PlanLimits.free;
    needsUpdate = true;
  }

  if (needsUpdate) {
    await UserModel.findByIdAndUpdate(user._id, update);
    logger.info({ userId: user._id, fields: Object.keys(update) }, 'Reconciled user');
    return true;
  }

  return false;
}
