import { Router } from 'express';
import { authenticateFlexible } from '../middleware/auth.js';
import {
  getLatestPrices,
  getPriceHistory,
  getProductPriceComparison
} from '../controllers/priceController.js';
import { comparePrices, auditPrice } from '../controllers/priceCompareController.js';

const router = Router();

// Public endpoints (no auth required) — demo tools
router.post('/compare', comparePrices);
router.post('/audit', auditPrice);

router.use(authenticateFlexible);

router.get('/latest', getLatestPrices);
router.get('/history', getPriceHistory);
router.get('/comparison/:productId', getProductPriceComparison);

export default router;
