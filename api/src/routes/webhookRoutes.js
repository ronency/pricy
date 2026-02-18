import { Router } from 'express';
import { validateWebhook, validateWebhookUpdate } from '@pricy/shared';
import { validate } from '../middleware/validation.js';
import { authenticateFlexible } from '../middleware/auth.js';
import { requireWebhooks } from '../middleware/planLimits.js';
import {
  getWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook
} from '../controllers/webhookController.js';

const router = Router();

router.use(authenticateFlexible);
router.use(requireWebhooks);

router.get('/', getWebhooks);
router.get('/:id', getWebhook);
router.post('/', validate(validateWebhook), createWebhook);
router.put('/:id', validate(validateWebhookUpdate), updateWebhook);
router.delete('/:id', deleteWebhook);
router.post('/:id/test', testWebhook);

export default router;
