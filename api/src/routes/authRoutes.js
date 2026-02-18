import { Router } from 'express';
import { validateLogin, validateUser } from '@pricy/shared';
import { validate } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import {
  signup,
  login,
  getProfile,
  updateProfile,
  generateApiKey,
  shopifyOAuth,
  shopifyCallback
} from '../controllers/authController.js';

const router = Router();

router.post('/signup', validate(validateUser), signup);
router.post('/login', validate(validateLogin), login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/api-key', authenticate, generateApiKey);
router.get('/shopify/oauth', authenticate, shopifyOAuth);
router.get('/shopify/callback', shopifyCallback);

export default router;
