import { Response, NextFunction } from 'express';
import { AuthRequest, HierarchyNode, Measure } from '../types/index';
import { gridDataService } from '../services/gridData.service';
import { aggregationService } from '../services/aggregation.service';
import { disaggregationService } from '../services/disaggregation.service';
import { hierarchyService } from '../services/hierarchy.service';
import { measuresService } from '../services/measures.service';

/**
 * GET /api/grid/data
 * Load the grid data for the planning UI.
 *
 * Query params:
 *  - nodeId (optional): root node id for subtree loading
 *  - depth (optional): max depth to load
 *  - versionId (optional): planning version to load; defaults to the default version
 */
export async function loadGridData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const nodeId = req.query.nodeId ? parseInt(req.query.nodeId as string, 10) : undefined;
    const depth = req.query.depth ? parseInt(req.query.depth as string, 10) : undefined;
    const versionId = req.query.versionId ? parseInt(req.query.versionId as string, 10) : undefined;

    const gridData = await gridDataService.loadGridData(nodeId, depth, undefined, versionId);
    res.json(gridData);
  } catch (error: any) {
    if (error.message?.includes('No version found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}

/**
 * PUT /api/grid/cell
 * Update a single cell value with full recalculation pipeline.
 *
 * Body:
 *  - nodeId: the hierarchy node being edited
 *  - measureId: the measure being edited
 *  - timePeriodId: the time period column
 *  - value: new numeric value
 *  - disaggregationMethod: 'proportional' | 'weighted' (for spreading down)
 *  - weightMeasureId: required when disaggregationMethod is 'weighted'
 *  - versionId: planning version id
 *
 * Pipeline:
 *  a) Save the cell value
 *  b) If node has children AND measure is editable, run disaggregation
 *  c) Recalculate derived measures for the edited node
 *  d) If disaggregated, recalculate derived measures for all children
 *  e) Aggregate up the hierarchy for the edited measure
 *  f) Aggregate up the hierarchy for all derived measures
 *  g) Aggregate time periods if the period has a parent
 *  h) Return all updated cells by reloading the grid data
 */
export async function updateCell(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      nodeId,
      measureId,
      timePeriodId,
      value,
      disaggregationMethod,
      weightMeasureId,
      versionId,
    } = req.body;

    // Validate required fields
    if (nodeId === undefined || measureId === undefined || timePeriodId === undefined || value === undefined) {
      res.status(400).json({ error: 'nodeId, measureId, timePeriodId, and value are required' });
      return;
    }

    const userId = req.user!.userId;

    // Resolve version - use provided or default
    let resolvedVersionId = versionId;
    if (!resolvedVersionId) {
      const db = (await import('../config/database')).default;
      const defaultVersion = await db('versions').where({ is_default: true }).first();
      if (!defaultVersion) {
        res.status(404).json({ error: 'No default version found' });
        return;
      }
      resolvedVersionId = defaultVersion.id;
    }

    // ── Step (a): Save the cell value ──
    await gridDataService.updateCell(nodeId, measureId, timePeriodId, value, resolvedVersionId, userId);

    // ── Determine if the node has children ──
    const subtree = await hierarchyService.getSubtree(nodeId);
    const hasChildren = subtree !== null && subtree.children !== undefined && subtree.children.length > 0;

    // ── Get the measure to check if it's editable ──
    const measures = await measuresService.getAll();
    const editedMeasure = measures.find((m: Measure) => m.id === measureId);

    if (!editedMeasure) {
      res.status(404).json({ error: `Measure with id ${measureId} not found` });
      return;
    }

    // ── Step (b): Disaggregate down if node has children and measure is editable ──
    let disaggregated = false;
    if (hasChildren && editedMeasure.is_editable) {
      if (disaggregationMethod === 'weighted' && weightMeasureId) {
        await disaggregationService.spreadWeighted(nodeId, measureId, timePeriodId, value, weightMeasureId, resolvedVersionId);
      } else {
        // Default to proportional
        await disaggregationService.spreadProportional(nodeId, measureId, timePeriodId, value, resolvedVersionId);
      }
      disaggregated = true;
    }

    // ── Step (c): Recalculate derived measures for the edited node ──
    await aggregationService.recalculateDerivedMeasures(nodeId, timePeriodId, resolvedVersionId);

    // ── Step (d): If disaggregated, recalculate derived measures for all descendant nodes ──
    if (disaggregated && subtree) {
      const descendantIds = collectDescendantIds(subtree);
      for (const childId of descendantIds) {
        await aggregationService.recalculateDerivedMeasures(childId, timePeriodId, resolvedVersionId);
      }
    }

    // ── Step (e): Aggregate up the hierarchy for the edited measure ──
    await aggregationService.aggregateUp(nodeId, measureId, timePeriodId, resolvedVersionId);

    // ── Step (f): Aggregate up the hierarchy for all derived measures ──
    const derivedMeasures = measures.filter((m: Measure) => m.formula !== null && m.formula !== '');
    for (const derived of derivedMeasures) {
      await aggregationService.aggregateUp(nodeId, derived.id, timePeriodId, resolvedVersionId);
    }

    // ── Step (g): Aggregate time periods if the period has a parent ──
    // Aggregate for the edited measure and all derived measures at all affected nodes
    const affectedMeasureIds = [measureId, ...derivedMeasures.map((m: Measure) => m.id)];
    const uniqueMeasureIds = [...new Set(affectedMeasureIds)];

    for (const mId of uniqueMeasureIds) {
      await aggregationService.aggregateTimePeriods(nodeId, mId, timePeriodId, resolvedVersionId);

      // Also aggregate time periods for ancestor nodes
      if (disaggregated && subtree) {
        const descendantIds = collectDescendantIds(subtree);
        for (const childId of descendantIds) {
          await aggregationService.aggregateTimePeriods(childId, mId, timePeriodId, resolvedVersionId);
        }
      }
    }

    // ── Step (h): Return all updated cells by reloading the grid data ──
    const gridData = await gridDataService.loadGridData(undefined, undefined, undefined, resolvedVersionId);
    res.json(gridData);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}

/**
 * Recursively collect all descendant node ids from a subtree (excluding the root).
 */
function collectDescendantIds(node: HierarchyNode): number[] {
  const ids: number[] = [];

  if (node.children) {
    for (const child of node.children) {
      ids.push(child.id);
      ids.push(...collectDescendantIds(child));
    }
  }

  return ids;
}
