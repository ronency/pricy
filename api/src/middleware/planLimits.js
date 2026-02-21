import { ProductModel } from '../config/productSchema.js';
import { CompetitorModel } from '../config/competitorSchema.js';
import { PlanLimits } from '@pricy/shared';

/**
 * Check if the user's subscription is in good standing.
 * Free plan users don't need an active subscription.
 * Past-due users get a warning header but can still access.
 * Canceled/unpaid users are treated as free regardless of plan field.
 */
function getEffectiveLimits(user, res) {
  if (user.plan === 'free') return user.planLimits;

  const status = user.stripeSubscriptionStatus;

  if (status === 'past_due') {
    res.set('X-Subscription-Past-Due', 'true');
    return user.planLimits;
  }

  if (status === 'active') return user.planLimits;

  // canceled, unpaid, incomplete_expired, or null — enforce free limits
  return PlanLimits.free;
}

export async function checkProductLimit(req, res, next) {
  try {
    const user = req.user;
    const limits = getEffectiveLimits(user, res);
    const productCount = await ProductModel.countDocuments({
      userId: user._id,
      isTracked: true
    });

    if (productCount >= limits.maxProducts) {
      return res.status(403).json({
        error: {
          message: `Product limit reached. Your ${user.plan} plan allows ${limits.maxProducts} tracked products.`,
          code: 'PLAN_LIMIT_EXCEEDED',
          data: {
            limit: limits.maxProducts,
            current: productCount,
            plan: user.plan
          }
        }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

export async function checkCompetitorLimit(req, res, next) {
  try {
    const user = req.user;
    const limits = getEffectiveLimits(user, res);
    const productId = req.body.productId || req.params.productId;

    const competitorCount = await CompetitorModel.countDocuments({
      userId: user._id,
      productId,
      isActive: true
    });

    if (competitorCount >= limits.maxCompetitorsPerProduct) {
      return res.status(403).json({
        error: {
          message: `Competitor limit reached. Your ${user.plan} plan allows ${limits.maxCompetitorsPerProduct} competitors per product.`,
          code: 'PLAN_LIMIT_EXCEEDED',
          data: {
            limit: limits.maxCompetitorsPerProduct,
            current: competitorCount,
            plan: user.plan
          }
        }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function requireWebhooks(req, res, next) {
  if (!req.user.planLimits.webhooksEnabled) {
    return res.status(403).json({
      error: {
        message: `Webhooks are not available on your ${req.user.plan} plan. Upgrade to Pro or higher.`,
        code: 'PLAN_LIMIT_EXCEEDED',
        data: { plan: req.user.plan }
      }
    });
  }
  next();
}

export function requireAdvancedRules(req, res, next) {
  if (!req.user.planLimits.advancedRules) {
    return res.status(403).json({
      error: {
        message: `Advanced rules are not available on your ${req.user.plan} plan. Upgrade to Pro or higher.`,
        code: 'PLAN_LIMIT_EXCEEDED',
        data: { plan: req.user.plan }
      }
    });
  }
  next();
}
