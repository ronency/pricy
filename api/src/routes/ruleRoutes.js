import { Router } from 'express';
import { validateRule, validateRuleUpdate } from '@pricy/shared';
import { validate } from '../middleware/validation.js';
import { authenticateFlexible } from '../middleware/auth.js';
import {
  getRules,
  getRule,
  createRule,
  updateRule,
  deleteRule
} from '../controllers/ruleController.js';

const router = Router();

router.use(authenticateFlexible);

router.get('/', getRules);
router.get('/:id', getRule);
router.post('/', validate(validateRule), createRule);
router.put('/:id', validate(validateRuleUpdate), updateRule);
router.delete('/:id', deleteRule);

export default router;
