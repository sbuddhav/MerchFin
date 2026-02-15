import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'merchfin-default-secret';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string; role: string };
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as 'admin' | 'planner' | 'viewer',
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
