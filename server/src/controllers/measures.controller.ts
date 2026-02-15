import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index';
import { measuresService } from '../services/measures.service';

/**
 * GET /api/measures
 * Retrieve all measures ordered by sort_order.
 */
export async function getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const measures = await measuresService.getAll();
    res.json(measures);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/measures
 * Create a new measure.
 */
export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, short_name, data_type, is_editable, formula, aggregation_type, weight_measure_id, sort_order, format_pattern, bg_color } = req.body;

    if (!name || !short_name || !data_type) {
      res.status(400).json({ error: 'Name, short_name, and data_type are required' });
      return;
    }

    const measure = await measuresService.create({
      name,
      short_name,
      data_type,
      is_editable,
      formula,
      aggregation_type,
      weight_measure_id,
      sort_order,
      format_pattern,
      bg_color,
    });

    res.status(201).json(measure);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/measures/:id
 * Update an existing measure.
 */
export async function update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name, short_name, data_type, is_editable, formula, aggregation_type, weight_measure_id, sort_order, format_pattern, bg_color } = req.body;

    const measure = await measuresService.update(id, {
      name,
      short_name,
      data_type,
      is_editable,
      formula,
      aggregation_type,
      weight_measure_id,
      sort_order,
      format_pattern,
      bg_color,
    });

    res.json(measure);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}

/**
 * DELETE /api/measures/:id
 * Delete a measure by id.
 */
export async function deleteMeasure(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    await measuresService.delete(id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}

/**
 * PUT /api/measures/reorder
 * Reorder measures by providing an ordered array of ids.
 */
export async function reorder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      res.status(400).json({ error: 'orderedIds must be a non-empty array of measure ids' });
      return;
    }

    const measures = await measuresService.reorder(orderedIds);
    res.json(measures);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/measures/:id/color
 * Quick-update only the bg_color of a measure (accessible to planners + admins).
 */
export async function updateColor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { bg_color } = req.body;

    const measure = await measuresService.update(id, { bg_color: bg_color || null });
    res.json(measure);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}
