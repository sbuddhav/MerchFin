import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  getLevels,
  createLevel,
  updateLevel,
  deleteLevel,
  getTree,
  getSubtree,
  createNode,
  updateNode,
  deleteNode,
} from '../controllers/hierarchy.controller';

const router = Router();

// All hierarchy routes require authentication
router.use(authenticate);

// ── Hierarchy Levels ──
router.get('/levels', getLevels);
router.post('/levels', authorize('admin'), createLevel);
router.put('/levels/:id', authorize('admin'), updateLevel);
router.delete('/levels/:id', authorize('admin'), deleteLevel);

// ── Hierarchy Nodes ──
router.get('/nodes', getTree);
router.get('/nodes/:id/subtree', getSubtree);
router.post('/nodes', authorize('admin'), createNode);
router.put('/nodes/:id', authorize('admin'), updateNode);
router.delete('/nodes/:id', authorize('admin'), deleteNode);

export default router;
