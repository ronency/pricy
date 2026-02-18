import { RuleModel } from '../config/ruleSchema.js';

export async function getRules(req, res, next) {
  try {
    const { product_id, active } = req.query;

    const query = { userId: req.user._id };
    if (product_id) query.productId = product_id;
    if (active !== undefined) query.isActive = active === 'true';

    const rules = await RuleModel
      .find(query)
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      rules: rules.map(r => r.toClient())
    });
  } catch (error) {
    next(error);
  }
}

export async function getRule(req, res, next) {
  try {
    const rule = await RuleModel.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!rule) {
      return res.status(404).json({
        error: { message: 'Rule not found', code: 'NOT_FOUND' }
      });
    }

    res.json({ rule: rule.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function createRule(req, res, next) {
  try {
    const rule = new RuleModel({
      ...req.validatedBody,
      userId: req.user._id
    });

    await rule.save();

    res.status(201).json({ rule: rule.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function updateRule(req, res, next) {
  try {
    const rule = await RuleModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.validatedBody,
      { new: true }
    );

    if (!rule) {
      return res.status(404).json({
        error: { message: 'Rule not found', code: 'NOT_FOUND' }
      });
    }

    res.json({ rule: rule.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function deleteRule(req, res, next) {
  try {
    const rule = await RuleModel.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!rule) {
      return res.status(404).json({
        error: { message: 'Rule not found', code: 'NOT_FOUND' }
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
