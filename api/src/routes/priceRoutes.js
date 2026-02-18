import { Router } from 'express';
import { authenticateFlexible } from '../middleware/auth.js';
import {
  getLatestPrices,
  getPriceHistory,
  getProductPriceComparison
} from '../controllers/priceController.js';

const router = Router();

router.use(authenticateFlexible);

router.get('/latest', getLatestPrices);
router.get('/history', getPriceHistory);
router.get('/comparison/:productId', getProductPriceComparison);

export default router;
