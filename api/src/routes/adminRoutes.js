import { Router } from 'express';
import { authenticateAdmin } from '../middleware/admin.js';
import {
  getDashboardStats,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  listAllProducts,
  listAllCompetitors,
  getPlanStats
} from '../controllers/adminController.js';
import { triggerJob, getRecentJobs, getAvailableJobs } from '../controllers/adminJobController.js';

const router = Router();

router.use(authenticateAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/products', listAllProducts);
router.get('/competitors', listAllCompetitors);
router.get('/plans', getPlanStats);

// Job management
router.get('/jobs', getAvailableJobs);
router.get('/jobs/recent', getRecentJobs);
router.post('/jobs/trigger', triggerJob);

export default router;
