import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createCheckoutSession, createPortalSession } from '../controllers/billingController.js';

const router = Router();

router.post('/checkout', authenticate, createCheckoutSession);
router.post('/portal', authenticate, createPortalSession);

export default router;
