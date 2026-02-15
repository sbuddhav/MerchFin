import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index';
import { hierarchyService } from '../services/hierarchy.service';

// ──────────────────────────────────────────────
//  Hierarchy Levels
// ──────────────────────────────────────────────

/**
 * GET /api/hierarchy/levels
 * Retrieve all hierarchy levels ordered by depth.
 */
export async function getLevels(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const levels = await hierarchyService.getLevels();
    res.json(levels);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/hierarchy/levels
 * Create a new hierarchy level.
 */
export async function createLevel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, depth } = req.body;

    if (!name || depth === undefined) {
      res.status(400).json({ error: 'Name and depth are required' });
      return;
    }

    const level = await hierarchyService.createLevel(name, depth);
    res.status(201).json(level);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/hierarchy/levels/:id
 * Update a hierarchy level's name.
 */
export async function updateLevel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const level = await hierarchyService.updateLevel(id, name);
    res.json(level);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}

/**
 * DELETE /api/hierarchy/levels/:id
 * Delete a hierarchy level.
 */
export async function deleteLevel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    await hierarchyService.deleteLevel(id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}

// ──────────────────────────────────────────────
//  Hierarchy Nodes
// ──────────────────────────────────────────────

/**
 * GET /api/hierarchy/nodes
 * Retrieve the full hierarchy tree.
 */
export async function getTree(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const tree = await hierarchyService.getTree();
    res.json(tree);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/hierarchy/nodes/:id/subtree
 * Retrieve the subtree rooted at a specific node.
 */
export async function getSubtree(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const subtree = await hierarchyService.getSubtree(id);

    if (!subtree) {
      res.status(404).json({ error: `Node with id ${id} not found` });
      return;
    }

    res.json(subtree);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/hierarchy/nodes
 * Create a new hierarchy node.
 */
export async function createNode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, levelId, parentId, sortOrder } = req.body;

    if (!name || !levelId) {
      res.status(400).json({ error: 'Name and levelId are required' });
      return;
    }

    const node = await hierarchyService.createNode(name, levelId, parentId ?? null, sortOrder);
    res.status(201).json(node);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}

/**
 * PUT /api/hierarchy/nodes/:id
 * Update a hierarchy node's name and/or sort order.
 */
export async function updateNode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name, sortOrder } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const node = await hierarchyService.updateNode(id, name, sortOrder);
    res.json(node);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}

/**
 * DELETE /api/hierarchy/nodes/:id
 * Delete a hierarchy node and all its descendants.
 */
export async function deleteNode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    await hierarchyService.deleteNode(id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}
