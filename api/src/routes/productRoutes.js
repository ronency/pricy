import { Router } from 'express';
import { validateProduct, validateProductTrack } from '@pricy/shared';
import { validate } from '../middleware/validation.js';
import { authenticateFlexible } from '../middleware/auth.js';
import { checkProductLimit } from '../middleware/planLimits.js';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  trackProducts,
  syncFromShopify,
  scanPrices
} from '../controllers/productController.js';

const router = Router();

router.use(authenticateFlexible);

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', checkProductLimit, validate(validateProduct), createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/track', validate(validateProductTrack), trackProducts);
router.post('/sync', syncFromShopify);
router.post('/scan', scanPrices);

export default router;
