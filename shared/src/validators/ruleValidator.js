import Joi from 'joi';
import { RuleTypes, RuleActionTypes } from '../models/Rule.js';

export const ruleSchema = Joi.object({
  productId: Joi.string().allow(null),
  name: Joi.string().min(1).max(200).required(),
  type: Joi.string().valid(...RuleTypes).required(),
  conditions: Joi.object({
    threshold: Joi.number(),
    thresholdPercent: Joi.number().min(0).max(100),
    thresholdAmount: Joi.number().min(0),
    competitorId: Joi.string().allow(null),
    timeWindowHours: Joi.number().integer().min(1)
  }).required(),
  actions: Joi.array().items(
    Joi.object({
      type: Joi.string().valid(...RuleActionTypes).required(),
      config: Joi.object().default({})
    })
  ).min(1).required(),
  priority: Joi.number().integer().min(0).max(100).default(0),
  isActive: Joi.boolean().default(true)
});

export const ruleUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(200),
  conditions: Joi.object({
    threshold: Joi.number(),
    thresholdPercent: Joi.number().min(0).max(100),
    thresholdAmount: Joi.number().min(0),
    competitorId: Joi.string().allow(null),
    timeWindowHours: Joi.number().integer().min(1)
  }),
  actions: Joi.array().items(
    Joi.object({
      type: Joi.string().valid(...RuleActionTypes).required(),
      config: Joi.object().default({})
    })
  ).min(1),
  priority: Joi.number().integer().min(0).max(100),
  isActive: Joi.boolean()
}).min(1);

export function validateRule(data) {
  return ruleSchema.validate(data, { abortEarly: false });
}

export function validateRuleUpdate(data) {
  return ruleUpdateSchema.validate(data, { abortEarly: false });
}
