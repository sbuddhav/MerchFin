import db from '../config/database';
import { CellValue, HierarchyNode } from '../types/index';

/**
 * Upsert a cell value within a transaction.
 */
async function upsertCellValue(
  trx: any,
  nodeId: number,
  measureId: number,
  timePeriodId: number,
  value: number | null,
  versionId: number,
  userId?: number
): Promise<void> {
  const existing = await trx('cell_values')
    .where({
      node_id: nodeId,
      measure_id: measureId,
      time_period_id: timePeriodId,
      version_id: versionId,
    })
    .first();

  if (existing) {
    await trx('cell_values')
      .where({ id: existing.id })
      .update({
        value,
        updated_by: userId ?? null,
        updated_at: db.fn.now(),
      });
  } else {
    await trx('cell_values').insert({
      node_id: nodeId,
      measure_id: measureId,
      time_period_id: timePeriodId,
      value,
      version_id: versionId,
      updated_by: userId ?? null,
    });
  }
}

export class DisaggregationService {
  /**
   * Proportional spread: distribute `newValue` to a node's children
   * based on their current proportion of the total.
   *
   * If children have existing values [100, 200, 300] (total 600) and the
   * parent is changed to 1200, the children become [200, 400, 600].
   *
   * If all children are zero or null, the value is distributed evenly.
   *
   * Recursively continues to spread down through each child's subtree
   * so that all descendants are updated proportionally.
   */
  async spreadProportional(
    nodeId: number,
    measureId: number,
    timePeriodId: number,
    newValue: number,
    versionId: number
  ): Promise<void> {
    await db.transaction(async (trx) => {
      await this.spreadProportionalRecursive(
        trx,
        nodeId,
        measureId,
        timePeriodId,
        newValue,
        versionId
      );
    });
  }

  /**
   * Weighted spread: distribute `newValue` to a node's children using
   * another measure as weights.
   *
   * For example, if spreading revenue across stores using square footage
   * as the weight measure, a store with 2x the square footage would receive
   * 2x the revenue allocation.
   *
   * Recursively continues to spread down through each child's subtree.
   */
  async spreadWeighted(
    nodeId: number,
    measureId: number,
    timePeriodId: number,
    newValue: number,
    weightMeasureId: number,
    versionId: number
  ): Promise<void> {
    await db.transaction(async (trx) => {
      await this.spreadWeightedRecursive(
        trx,
        nodeId,
        measureId,
        timePeriodId,
        newValue,
        weightMeasureId,
        versionId
      );
    });
  }

  // ──────────────────────────────────────────────
  //  Private helpers
  // ──────────────────────────────────────────────

  /**
   * Recursive proportional spread implementation.
   */
  private async spreadProportionalRecursive(
    trx: any,
    nodeId: number,
    measureId: number,
    timePeriodId: number,
    newValue: number,
    versionId: number
  ): Promise<void> {
    // Get direct children of this node
    const children = await trx('hierarchy_nodes')
      .where({ parent_id: nodeId })
      .orderBy('sort_order', 'asc');

    // Leaf node — nothing to spread
    if (children.length === 0) return;

    const childIds = children.map((c: HierarchyNode) => c.id);

    // Load current child values for this measure + time period
    const childCells = await trx('cell_values')
      .whereIn('node_id', childIds)
      .where({
        measure_id: measureId,
        time_period_id: timePeriodId,
        version_id: versionId,
      });

    // Build a map of child id → current value (parse strings to numbers for PG NUMERIC)
    const valueMap = new Map<number, number>();
    for (const cell of childCells) {
      if (cell.value !== null) {
        valueMap.set(cell.node_id, Number(cell.value));
      }
    }

    // Compute the current total of child values
    const currentTotal = Array.from(valueMap.values()).reduce(
      (sum, v) => sum + v,
      0
    );

    // Determine each child's new value
    const childUpdates: Array<{ id: number; value: number }> = [];

    if (currentTotal !== 0) {
      // Proportional spread based on existing ratios
      let runningTotal = 0;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const currentValue = valueMap.get(child.id) ?? 0;

        if (i === children.length - 1) {
          // Last child gets the remainder to avoid rounding errors
          childUpdates.push({
            id: child.id,
            value: newValue - runningTotal,
          });
        } else {
          const proportion = currentValue / currentTotal;
          const childValue = Math.round(newValue * proportion * 100) / 100;
          childUpdates.push({ id: child.id, value: childValue });
          runningTotal += childValue;
        }
      }
    } else {
      // Even spread when all children are zero or null
      let runningTotal = 0;

      for (let i = 0; i < children.length; i++) {
        if (i === children.length - 1) {
          childUpdates.push({
            id: children[i].id,
            value: newValue - runningTotal,
          });
        } else {
          const childValue =
            Math.round((newValue / children.length) * 100) / 100;
          childUpdates.push({ id: children[i].id, value: childValue });
          runningTotal += childValue;
        }
      }
    }

    // Save the computed values and recurse into each child
    for (const update of childUpdates) {
      await upsertCellValue(
        trx,
        update.id,
        measureId,
        timePeriodId,
        update.value,
        versionId
      );

      // Recurse to spread further down the tree
      await this.spreadProportionalRecursive(
        trx,
        update.id,
        measureId,
        timePeriodId,
        update.value,
        versionId
      );
    }
  }

  /**
   * Recursive weighted spread implementation.
   */
  private async spreadWeightedRecursive(
    trx: any,
    nodeId: number,
    measureId: number,
    timePeriodId: number,
    newValue: number,
    weightMeasureId: number,
    versionId: number
  ): Promise<void> {
    // Get direct children of this node
    const children = await trx('hierarchy_nodes')
      .where({ parent_id: nodeId })
      .orderBy('sort_order', 'asc');

    // Leaf node — nothing to spread
    if (children.length === 0) return;

    const childIds = children.map((c: HierarchyNode) => c.id);

    // Load weight values for each child
    const weightCells = await trx('cell_values')
      .whereIn('node_id', childIds)
      .where({
        measure_id: weightMeasureId,
        time_period_id: timePeriodId,
        version_id: versionId,
      });

    // Build weight map (parse strings to numbers for PG NUMERIC)
    const weightMap = new Map<number, number>();
    for (const cell of weightCells) {
      const numVal = Number(cell.value);
      if (cell.value !== null && numVal > 0) {
        weightMap.set(cell.node_id, numVal);
      }
    }

    const totalWeight = Array.from(weightMap.values()).reduce(
      (sum, w) => sum + w,
      0
    );

    const childUpdates: Array<{ id: number; value: number }> = [];

    if (totalWeight > 0) {
      // Weighted spread
      let runningTotal = 0;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const weight = weightMap.get(child.id) ?? 0;

        if (i === children.length - 1) {
          // Last child gets the remainder
          childUpdates.push({
            id: child.id,
            value: newValue - runningTotal,
          });
        } else {
          const proportion = weight / totalWeight;
          const childValue = Math.round(newValue * proportion * 100) / 100;
          childUpdates.push({ id: child.id, value: childValue });
          runningTotal += childValue;
        }
      }
    } else {
      // Fall back to even spread when no weights exist
      let runningTotal = 0;

      for (let i = 0; i < children.length; i++) {
        if (i === children.length - 1) {
          childUpdates.push({
            id: children[i].id,
            value: newValue - runningTotal,
          });
        } else {
          const childValue =
            Math.round((newValue / children.length) * 100) / 100;
          childUpdates.push({ id: children[i].id, value: childValue });
          runningTotal += childValue;
        }
      }
    }

    // Save values and recurse into each child
    for (const update of childUpdates) {
      await upsertCellValue(
        trx,
        update.id,
        measureId,
        timePeriodId,
        update.value,
        versionId
      );

      // Continue spreading down the tree
      await this.spreadWeightedRecursive(
        trx,
        update.id,
        measureId,
        timePeriodId,
        update.value,
        weightMeasureId,
        versionId
      );
    }
  }
}

export const disaggregationService = new DisaggregationService();
