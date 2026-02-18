import Joi from 'joi';

export const competitorSchema = Joi.object({
  productId: Joi.string().required(),
  name: Joi.string().min(1).max(200).required(),
  url: Joi.string().uri().required(),
  currency: Joi.string().length(3).uppercase().default('USD'),
  selectors: Joi.object({
    priceSelector: Joi.string().allow(null),
    titleSelector: Joi.string().allow(null),
    currencySelector: Joi.string().allow(null)
  }).allow(null),
  isActive: Joi.boolean().default(true)
});

export const competitorUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(200),
  url: Joi.string().uri(),
  currency: Joi.string().length(3).uppercase(),
  selectors: Joi.object({
    priceSelector: Joi.string().allow(null),
    titleSelector: Joi.string().allow(null),
    currencySelector: Joi.string().allow(null)
  }),
  isActive: Joi.boolean()
}).min(1);

export function validateCompetitor(data) {
  return competitorSchema.validate(data, { abortEarly: false });
}

export function validateCompetitorUpdate(data) {
  return competitorUpdateSchema.validate(data, { abortEarly: false });
}
