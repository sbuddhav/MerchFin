import db from '../config/database';
import {
  CellUpdate,
  CellValue,
  GridDataResponse,
  HierarchyNode,
  Measure,
  TimePeriod,
} from '../types/index';

/**
 * Compose a cell value lookup key.
 * Format: "nodeId:measureId:timePeriodId"
 */
function cellKey(
  nodeId: number,
  measureId: number,
  timePeriodId: number
): string {
  return `${nodeId}:${measureId}:${timePeriodId}`;
}

export class GridDataService {
  /**
   * Load the full grid payload for the planning grid UI.
   *
   * Returns:
   *  - hierarchy: nested tree of nodes (optionally rooted at nodeId)
   *  - timePeriods: nested tree of time periods
   *  - measures: ordered list of measures
   *  - values: flat map keyed by "nodeId:measureId:timePeriodId" → value
   */
  async loadGridData(
    nodeId?: number,
    depth?: number,
    timePeriodIds?: number[],
    versionId?: number
  ): Promise<GridDataResponse> {
    // Resolve version
    const version = versionId
      ? await db('versions').where({ id: versionId }).first()
      : await db('versions').where({ is_default: true }).first();

    if (!version) {
      throw new Error('No version found. Please create a planning version.');
    }

    // 1. Load hierarchy tree
    const hierarchy = await this.loadHierarchy(nodeId, depth);

    // 2. Load time periods
    const timePeriods = await this.loadTimePeriods(timePeriodIds);

    // 3. Load measures
    const measures: Measure[] = await db<Measure>('measures').orderBy(
      'sort_order',
      'asc'
    );

    // 4. Collect all visible node ids from the hierarchy
    const nodeIds = this.collectNodeIds(hierarchy);

    // 5. Collect all visible time period ids
    const periodIds = timePeriodIds?.length
      ? timePeriodIds
      : this.collectTimePeriodIds(timePeriods);

    // 6. Load cell values
    const values = await this.loadValues(
      nodeIds,
      measures.map((m) => m.id),
      periodIds,
      version.id
    );

    return { hierarchy, timePeriods, measures, values };
  }

  /**
   * Save a single cell value (upsert).
   */
  async updateCell(
    nodeId: number,
    measureId: number,
    timePeriodId: number,
    value: number | null,
    versionId: number,
    userId: number
  ): Promise<CellValue> {
    const existing = await db<CellValue>('cell_values')
      .where({
        node_id: nodeId,
        measure_id: measureId,
        time_period_id: timePeriodId,
        version_id: versionId,
      })
      .first();

    if (existing) {
      const [updated] = await db<CellValue>('cell_values')
        .where({ id: existing.id })
        .update({
          value,
          updated_by: userId,
          updated_at: db.fn.now(),
        })
        .returning('*');
      return updated;
    }

    const [created] = await db<CellValue>('cell_values')
      .insert({
        node_id: nodeId,
        measure_id: measureId,
        time_period_id: timePeriodId,
        value,
        version_id: versionId,
        updated_by: userId,
      })
      .returning('*');

    return created;
  }

  /**
   * Save multiple cell values in a single transaction.
   */
  async batchUpdateCells(
    updates: CellUpdate[],
    versionId: number,
    userId: number
  ): Promise<CellValue[]> {
    const results: CellValue[] = [];

    await db.transaction(async (trx) => {
      for (const update of updates) {
        const existing = await trx<CellValue>('cell_values')
          .where({
            node_id: update.nodeId,
            measure_id: update.measureId,
            time_period_id: update.timePeriodId,
            version_id: versionId,
          })
          .first();

        if (existing) {
          const [updated] = await trx<CellValue>('cell_values')
            .where({ id: existing.id })
            .update({
              value: update.value,
              updated_by: userId,
              updated_at: db.fn.now(),
            })
            .returning('*');
          results.push(updated);
        } else {
          const [created] = await trx<CellValue>('cell_values')
            .insert({
              node_id: update.nodeId,
              measure_id: update.measureId,
              time_period_id: update.timePeriodId,
              value: update.value,
              version_id: versionId,
              updated_by: userId,
            })
            .returning('*');
          results.push(created);
        }
      }
    });

    return results;
  }

  // ──────────────────────────────────────────────
  //  Private helpers
  // ──────────────────────────────────────────────

  /**
   * Load hierarchy as a nested tree, optionally rooted at a specific node
   * and capped to a maximum depth.
   */
  private async loadHierarchy(
    rootNodeId?: number,
    maxDepth?: number
  ): Promise<HierarchyNode[]> {
    const depthCondition =
      maxDepth !== undefined ? `AND s.tree_depth < ${Number(maxDepth)}` : '';

    const rootCondition = rootNodeId
      ? `n.id = ${Number(rootNodeId)}`
      : `n.parent_id IS NULL`;

    const result = await db.raw(`
      WITH RECURSIVE subtree AS (
        SELECT
          n.id, n.name, n.level_id, n.parent_id, n.sort_order,
          n.created_at, n.updated_at,
          l.name AS level_name,
          0 AS tree_depth
        FROM hierarchy_nodes n
        JOIN hierarchy_levels l ON l.id = n.level_id
        WHERE ${rootCondition}

        UNION ALL

        SELECT
          c.id, c.name, c.level_id, c.parent_id, c.sort_order,
          c.created_at, c.updated_at,
          l.name AS level_name,
          s.tree_depth + 1
        FROM hierarchy_nodes c
        JOIN hierarchy_levels l ON l.id = c.level_id
        JOIN subtree s ON s.id = c.parent_id
        WHERE 1=1 ${depthCondition}
      )
      SELECT * FROM subtree
      ORDER BY tree_depth, sort_order, name
    `);

    return this.buildTree(result.rows);
  }

  /**
   * Load time periods, optionally filtered, as a nested tree.
   */
  private async loadTimePeriods(
    timePeriodIds?: number[]
  ): Promise<TimePeriod[]> {
    let query = db<TimePeriod>('time_periods')
      .orderBy('depth', 'asc')
      .orderBy('sort_order', 'asc');

    if (timePeriodIds?.length) {
      query = query.whereIn('id', timePeriodIds);
    }

    const rows = await query;
    return this.buildTimePeriodTree(rows);
  }

  /**
   * Load cell values for the given node × measure × period × version matrix.
   */
  private async loadValues(
    nodeIds: number[],
    measureIds: number[],
    periodIds: number[],
    versionId: number
  ): Promise<Record<string, number | null>> {
    if (!nodeIds.length || !measureIds.length || !periodIds.length) {
      return {};
    }

    const rows = await db<CellValue>('cell_values')
      .whereIn('node_id', nodeIds)
      .whereIn('measure_id', measureIds)
      .whereIn('time_period_id', periodIds)
      .where({ version_id: versionId });

    const values: Record<string, number | null> = {};

    for (const row of rows) {
      values[cellKey(row.node_id, row.measure_id, row.time_period_id)] =
        row.value !== null && row.value !== undefined ? Number(row.value) : null;
    }

    return values;
  }

  /**
   * Recursively collect all node ids from a nested hierarchy tree.
   */
  private collectNodeIds(nodes: HierarchyNode[]): number[] {
    const ids: number[] = [];
    const stack = [...nodes];

    while (stack.length) {
      const node = stack.pop()!;
      ids.push(node.id);
      if (node.children) {
        stack.push(...node.children);
      }
    }

    return ids;
  }

  /**
   * Recursively collect all time period ids from a nested tree.
   */
  private collectTimePeriodIds(periods: TimePeriod[]): number[] {
    const ids: number[] = [];
    const stack = [...periods];

    while (stack.length) {
      const period = stack.pop()!;
      ids.push(period.id);
      if (period.children) {
        stack.push(...period.children);
      }
    }

    return ids;
  }

  /**
   * Build a nested hierarchy tree from flat rows.
   */
  private buildTree(rows: any[]): HierarchyNode[] {
    const map = new Map<number, HierarchyNode>();
    const roots: HierarchyNode[] = [];

    for (const row of rows) {
      map.set(row.id, { ...row, children: [] });
    }

    for (const row of rows) {
      const node = map.get(row.id)!;
      if (row.parent_id === null || !map.has(row.parent_id)) {
        roots.push(node);
      } else {
        map.get(row.parent_id)!.children!.push(node);
      }
    }

    return roots;
  }

  /**
   * Build a nested time period tree from flat rows.
   */
  private buildTimePeriodTree(rows: TimePeriod[]): TimePeriod[] {
    const map = new Map<number, TimePeriod>();
    const roots: TimePeriod[] = [];

    for (const row of rows) {
      map.set(row.id, { ...row, children: [] });
    }

    for (const row of rows) {
      const node = map.get(row.id)!;
      if (row.parent_id === null || !map.has(row.parent_id)) {
        roots.push(node);
      } else {
        map.get(row.parent_id)!.children!.push(node);
      }
    }

    return roots;
  }
}

export const gridDataService = new GridDataService();
