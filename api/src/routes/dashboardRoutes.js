import { Router } from 'express';
import { authenticateFlexible } from '../middleware/auth.js';
import { getDashboardInsights } from '../controllers/dashboardController.js';

const router = Router();

router.use(authenticateFlexible);

router.get('/insights', getDashboardInsights);

export default router;
