import { ProductModel } from '../config/productSchema.js';
import { CompetitorModel } from '../config/competitorSchema.js';

export async function checkProductLimit(req, res, next) {
  try {
    const user = req.user;
    const productCount = await ProductModel.countDocuments({
      userId: user._id,
      isTracked: true
    });

    if (productCount >= user.planLimits.maxProducts) {
      return res.status(403).json({
        error: {
          message: `Product limit reached. Your ${user.plan} plan allows ${user.planLimits.maxProducts} tracked products.`,
          code: 'PLAN_LIMIT_EXCEEDED',
          data: {
            limit: user.planLimits.maxProducts,
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
    const productId = req.body.productId || req.params.productId;

    const competitorCount = await CompetitorModel.countDocuments({
      userId: user._id,
      productId,
      isActive: true
    });

    if (competitorCount >= user.planLimits.maxCompetitorsPerProduct) {
      return res.status(403).json({
        error: {
          message: `Competitor limit reached. Your ${user.plan} plan allows ${user.planLimits.maxCompetitorsPerProduct} competitors per product.`,
          code: 'PLAN_LIMIT_EXCEEDED',
          data: {
            limit: user.planLimits.maxCompetitorsPerProduct,
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
