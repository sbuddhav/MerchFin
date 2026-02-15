import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  getAll,
  create,
  update,
  deleteMeasure,
  reorder,
  updateColor,
} from '../controllers/measures.controller';

const router = Router();

// All measures routes require authentication
router.use(authenticate);

router.get('/', getAll);
router.post('/', authorize('admin'), create);
router.put('/reorder', authorize('admin'), reorder);
router.put('/:id/color', authorize('planner', 'admin'), updateColor);
router.put('/:id', authorize('admin'), update);
router.delete('/:id', authorize('admin'), deleteMeasure);

export default router;
