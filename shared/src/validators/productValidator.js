import Joi from 'joi';

export const productSchema = Joi.object({
  shopifyProductId: Joi.string().allow(null),
  title: Joi.string().min(1).max(500).required(),
  description: Joi.string().max(5000).allow(''),
  vendor: Joi.string().max(200).allow(''),
  productType: Joi.string().max(200).allow(''),
  handle: Joi.string().max(500).allow(''),
  imageUrl: Joi.string().uri().allow(null, ''),
  variants: Joi.array().items(
    Joi.object({
      shopifyVariantId: Joi.string().allow(null),
      title: Joi.string().max(200).default('Default'),
      sku: Joi.string().max(100).allow(''),
      price: Joi.number().min(0).allow(null),
      compareAtPrice: Joi.number().min(0).allow(null),
      inventoryQuantity: Joi.number().integer().default(0)
    })
  ).default([]),
  currentPrice: Joi.number().min(0).allow(null),
  currency: Joi.string().length(3).uppercase().default('USD'),
  isTracked: Joi.boolean().default(true)
});

export const productTrackSchema = Joi.object({
  productIds: Joi.array().items(Joi.string()).min(1).required()
});

export function validateProduct(data) {
  return productSchema.validate(data, { abortEarly: false });
}

export function validateProductTrack(data) {
  return productTrackSchema.validate(data, { abortEarly: false });
}
