import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index';
import { authService } from '../services/auth.service';
import db from '../config/database';

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token.
 */
export async function login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Invalid email or password') {
      res.status(401).json({ error: error.message });
      return;
    }
    next(error);
  }
}

/**
 * POST /api/auth/register
 * Register a new user (admin only).
 */
export async function register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    const user = await authService.register(email, password, name, role);
    res.status(201).json(user);
  } catch (error: any) {
    if (error.message === 'A user with this email already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    if (error.message === 'Password must be at least 8 characters long') {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Return the currently authenticated user from JWT.
 */
export async function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Fetch full user from DB
    const user = await db('users')
      .select('id', 'email', 'name', 'role', 'created_at', 'updated_at')
      .where({ id: req.user.userId })
      .first();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
}
