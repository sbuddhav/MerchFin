import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { login, register, me } from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/login - Public endpoint
router.post('/login', login);

// POST /api/auth/register - Admin only (must be authenticated and admin)
router.post('/register', authenticate, authorize('admin'), register);

// GET /api/auth/me - Authenticated users
router.get('/me', authenticate, me);

export default router;
