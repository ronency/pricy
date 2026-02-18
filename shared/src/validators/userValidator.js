import Joi from 'joi';
import { Plans } from '../models/User.js';

export const userSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).max(128),
  name: Joi.string().min(2).max(100).required(),
  shopifyDomain: Joi.string().pattern(/^[a-zA-Z0-9-]+\.myshopify\.com$/).allow(null),
  plan: Joi.string().valid(...Plans).default('free'),
  webhookUrl: Joi.string().uri().allow(null),
  emailNotifications: Joi.boolean().default(true),
  weeklyDigest: Joi.boolean().default(true),
  isActive: Joi.boolean().default(true)
});

export const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  webhookUrl: Joi.string().uri().allow(null, ''),
  emailNotifications: Joi.boolean(),
  weeklyDigest: Joi.boolean()
}).min(1);

export const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required()
});

export function validateUser(data) {
  return userSchema.validate(data, { abortEarly: false });
}

export function validateUserUpdate(data) {
  return userUpdateSchema.validate(data, { abortEarly: false });
}

export function validateLogin(data) {
  return loginSchema.validate(data, { abortEarly: false });
}
