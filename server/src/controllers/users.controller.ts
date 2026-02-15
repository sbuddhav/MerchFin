import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest, User } from '../types/index';
import db from '../config/database';

const SALT_ROUNDS = 12;

/**
 * GET /api/users
 * Retrieve all users (without passwords).
 */
export async function getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await db<User>('users')
      .select('id', 'email', 'name', 'role', 'created_at', 'updated_at')
      .orderBy('created_at', 'asc');

    res.json(users);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/users
 * Create a new user.
 */
export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    const existingUser = await db<User>('users').where({ email }).first();
    if (existingUser) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db<User>('users')
      .insert({
        email,
        password: hashedPassword,
        name,
        role: role || 'planner',
      })
      .returning('*');

    const { password: _pwd, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/users/:id
 * Update a user's name, email, role, or password.
 */
export async function update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { email, password, name, role } = req.body;

    const existing = await db<User>('users').where({ id }).first();
    if (!existing) {
      res.status(404).json({ error: `User with id ${id} not found` });
      return;
    }

    const updateData: Partial<User> = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;

    if (password) {
      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters long' });
        return;
      }
      updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const [user] = await db<User>('users')
      .where({ id })
      .update({ ...updateData, updated_at: db.fn.now() })
      .returning('*');

    const { password: _pwd, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/:id
 * Delete a user by id.
 */
export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);

    const existing = await db<User>('users').where({ id }).first();
    if (!existing) {
      res.status(404).json({ error: `User with id ${id} not found` });
      return;
    }

    // Prevent deleting yourself
    if (req.user && req.user.userId === id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    await db<User>('users').where({ id }).del();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/users/:id/assignments
 * Update a user's hierarchy node assignments.
 * Body: { nodeIds: number[] }
 */
export async function updateAssignments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { nodeIds } = req.body;

    const existing = await db<User>('users').where({ id }).first();
    if (!existing) {
      res.status(404).json({ error: `User with id ${id} not found` });
      return;
    }

    if (!Array.isArray(nodeIds)) {
      res.status(400).json({ error: 'nodeIds must be an array of hierarchy node ids' });
      return;
    }

    // Replace all assignments within a transaction
    await db.transaction(async (trx) => {
      // Remove existing assignments
      await trx('user_node_assignments').where({ user_id: id }).del();

      // Insert new assignments
      if (nodeIds.length > 0) {
        const rows = nodeIds.map((nodeId: number) => ({
          user_id: id,
          node_id: nodeId,
        }));
        await trx('user_node_assignments').insert(rows);
      }
    });

    // Return the updated assignments
    const assignments = await db('user_node_assignments')
      .where({ user_id: id })
      .select('node_id');

    res.json({
      userId: id,
      nodeIds: assignments.map((a: any) => a.node_id),
    });
  } catch (error) {
    next(error);
  }
}
