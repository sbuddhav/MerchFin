import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { loadGridData, updateCell } from '../controllers/gridData.controller';

const router = Router();

// All grid data routes require authentication
router.use(authenticate);

// GET /api/grid/data - Load grid data (all authenticated users can view)
router.get('/data', loadGridData);

// PUT /api/grid/cell - Update a cell value (planners and admins only)
router.put('/cell', authorize('planner', 'admin'), updateCell);

export default router;
