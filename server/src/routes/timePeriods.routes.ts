import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  getConfig,
  updateConfig,
  getPeriods,
  generatePeriods,
} from '../controllers/timePeriods.controller';

const router = Router();

// All time period routes require authentication
router.use(authenticate);

router.get('/config', getConfig);
router.put('/config', authorize('admin'), updateConfig);
router.get('/', getPeriods);
router.post('/generate', authorize('admin'), generatePeriods);

export default router;
