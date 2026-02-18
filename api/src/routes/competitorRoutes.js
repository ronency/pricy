import { Router } from 'express';
import { validateCompetitor, validateCompetitorUpdate } from '@pricy/shared';
import { validate } from '../middleware/validation.js';
import { authenticateFlexible } from '../middleware/auth.js';
import { checkCompetitorLimit } from '../middleware/planLimits.js';
import {
  getCompetitors,
  getCompetitor,
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
  checkCompetitorPrice
} from '../controllers/competitorController.js';

const router = Router();

router.use(authenticateFlexible);

router.get('/', getCompetitors);
router.get('/:id', getCompetitor);
router.post('/', checkCompetitorLimit, validate(validateCompetitor), createCompetitor);
router.put('/:id', validate(validateCompetitorUpdate), updateCompetitor);
router.delete('/:id', deleteCompetitor);
router.post('/:id/check', checkCompetitorPrice);

export default router;
