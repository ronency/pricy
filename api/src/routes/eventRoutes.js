import { Router } from 'express';
import { authenticateFlexible } from '../middleware/auth.js';
import {
  getEvents,
  getEvent,
  markAsRead,
  getWeeklySummary
} from '../controllers/eventController.js';

const router = Router();

router.use(authenticateFlexible);

router.get('/', getEvents);
router.get('/summary/weekly', getWeeklySummary);
router.get('/:id', getEvent);
router.put('/:id/read', markAsRead);

export default router;
