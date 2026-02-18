import Joi from 'joi';
import { WebhookEvents } from '../models/Webhook.js';

export const webhookSchema = Joi.object({
  url: Joi.string().uri().required(),
  events: Joi.array().items(
    Joi.string().valid(...WebhookEvents)
  ).min(1).default(['all']),
  isActive: Joi.boolean().default(true)
});

export const webhookUpdateSchema = Joi.object({
  url: Joi.string().uri(),
  events: Joi.array().items(
    Joi.string().valid(...WebhookEvents)
  ).min(1),
  isActive: Joi.boolean()
}).min(1);

export function validateWebhook(data) {
  return webhookSchema.validate(data, { abortEarly: false });
}

export function validateWebhookUpdate(data) {
  return webhookUpdateSchema.validate(data, { abortEarly: false });
}
