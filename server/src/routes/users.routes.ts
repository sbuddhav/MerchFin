import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  getAll,
  create,
  update,
  deleteUser,
  updateAssignments,
} from '../controllers/users.controller';

const router = Router();

// All user routes require authentication and admin role
router.use(authenticate, authorize('admin'));

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', deleteUser);
router.put('/:id/assignments', updateAssignments);

export default router;
