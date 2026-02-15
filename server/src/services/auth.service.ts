import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database';
import { User } from '../types/index';

const JWT_SECRET = process.env.JWT_SECRET || 'merchfin-default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Authenticate a user with email and password.
   * Returns a signed JWT token on success.
   */
  async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: Omit<User, 'password'> }> {
    const user = await db<User>('users').where({ email }).first();

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const { password: _pwd, ...userWithoutPassword } = user;

    return { token, user: userWithoutPassword };
  }

  /**
   * Register a new user account.
   * Hashes the password and stores the user record.
   */
  async register(
    email: string,
    password: string,
    name: string,
    role: User['role'] = 'planner'
  ): Promise<Omit<User, 'password'>> {
    // Check if user already exists
    const existingUser = await db<User>('users').where({ email }).first();

    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db<User>('users')
      .insert({
        email,
        password: hashedPassword,
        name,
        role,
      })
      .returning('*');

    const { password: _pwd, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }
}

export const authService = new AuthService();
