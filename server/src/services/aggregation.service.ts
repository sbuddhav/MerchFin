import { evaluate } from 'mathjs';
import db from '../config/database';
import { CellValue, Measure, TimePeriod } from '../types/index';

/**
 * Upsert a cell value, returning the updated/created row.
 */
async function upsertCellValue(
  trx: any,
  nodeId: number,
  measureId: number,
  timePeriodId: number,
  value: number | null,
  versionId: number
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
      .update({ value, updated_at: db.fn.now() });
  } else {
    await trx('cell_values').insert({
      node_id: nodeId,
      measure_id: measureId,
      time_period_id: timePeriodId,
      value,
      version_id: versionId,
    });
  }
}

export class AggregationService {
  /**
   * Recalculate the value of a parent node by aggregating its children's
   * values, then continue upward to the root of the hierarchy.
   *
   * Aggregation depends on the measure's aggregation_type:
   *  - SUM:          parent = sum(children)
   *  - AVG:          parent = avg(children)
   *  - WEIGHTED_AVG: parent = sum(child_value * child_weight) / sum(child_weight)
   *  - NONE:         no aggregation performed
   */
  async aggregateUp(
    nodeId: number,
    measureId: number,
    timePeriodId: number,
    versionId: number
  ): Promise<void> {
    const measure = await db<Measure>('measures')
      .where({ id: measureId })
      .first();

    if (!measure) {
      throw new Error(`Measure with id ${measureId} not found`);
    }

    if (measure.aggregation_type === 'NONE') return;

    await db.transaction(async (trx) => {
      await this.aggregateNodeUp(
        trx,
        nodeId,
        measure,
        timePeriodId,
        versionId
      );
    });
  }

  /**
   * Aggregate leaf-level time periods upward to their parent periods.
   *
   * For example, monthly values roll up into quarterly totals, which roll
   * up into yearly totals. The aggregation method follows the measure's
   * aggregation_type.
   */
  async aggregateTimePeriods(
    nodeId: number,
    measureId: number,
    timePeriodId: number,
    versionId: number
  ): Promise<void> {
    const measure = await db<Measure>('measures')
      .where({ id: measureId })
      .first();

    if (!measure) {
      throw new Error(`Measure with id ${measureId} not found`);
    }

    if (measure.aggregation_type === 'NONE') return;

    await db.transaction(async (trx) => {
      await this.aggregateTimePeriodUp(
        trx,
        nodeId,
        measure,
        timePeriodId,
        versionId
      );
    });
  }

  /**
   * Evaluate formula-based (derived) measures for a specific node and
   * time period. Formulas may reference other measures by their short_name
   * (e.g. "Revenue / Units").
   *
   * Uses mathjs for safe formula evaluation.
   */
  async recalculateDerivedMeasures(
    nodeId: number,
    timePeriodId: number,
    versionId: number
  ): Promise<void> {
    // Get all derived measures (those with a formula)
    const derivedMeasures = await db<Measure>('measures')
      .whereNotNull('formula')
      .where('formula', '!=', '')
      .orderBy('sort_order', 'asc');

    if (derivedMeasures.length === 0) return;

    // Get all measures for building the evaluation scope
    const allMeasures = await db<Measure>('measures').orderBy(
      'sort_order',
      'asc'
    );

    // Load current cell values for this node+period
    const cellValues = await db<CellValue>('cell_values')
      .where({
        node_id: nodeId,
        time_period_id: timePeriodId,
        version_id: versionId,
      });

    // Build a scope map: short_name → value
    const scope: Record<string, number> = {};
    for (const measure of allMeasures) {
      const cell = cellValues.find((cv) => cv.measure_id === measure.id);
      scope[measure.short_name] = cell?.value !== null && cell?.value !== undefined ? Number(cell.value) : 0;
    }

    await db.transaction(async (trx) => {
      for (const derived of derivedMeasures) {
        try {
          const result = evaluate(derived.formula!, scope);
          const numericValue =
            typeof result === 'number' && isFinite(result) ? result : null;

          await upsertCellValue(
            trx,
            nodeId,
            derived.id,
            timePeriodId,
            numericValue,
            versionId
          );
        } catch {
          // If evaluation fails (division by zero, bad formula, etc.),
          // store null rather than crashing.
          await upsertCellValue(
            trx,
            nodeId,
            derived.id,
            timePeriodId,
            null,
            versionId
          );
        }
      }
    });
  }

  // ──────────────────────────────────────────────
  //  Private helpers
  // ──────────────────────────────────────────────

  /**
   * Recursively aggregate a node upward through the hierarchy.
   */
  private async aggregateNodeUp(
    trx: any,
    nodeId: number,
    measure: Measure,
    timePeriodId: number,
    versionId: number
  ): Promise<void> {
    // Find the parent of this node
    const node = await trx('hierarchy_nodes').where({ id: nodeId }).first();
    if (!node || node.parent_id === null) return;

    const parentId = node.parent_id;

    // Get all siblings (children of the parent)
    const siblings = await trx('hierarchy_nodes')
      .where({ parent_id: parentId });

    const siblingIds = siblings.map((s: any) => s.id);

    // Load values for all siblings
    const childValues = await trx('cell_values')
      .whereIn('node_id', siblingIds)
      .where({
        measure_id: measure.id,
        time_period_id: timePeriodId,
        version_id: versionId,
      });

    let aggregatedValue: number | null = null;

    switch (measure.aggregation_type) {
      case 'SUM': {
        const values = childValues
          .map((cv: CellValue) => Number(cv.value))
          .filter((v: number) => !isNaN(v) && v !== null);
        aggregatedValue = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) : null;
        break;
      }

      case 'AVG': {
        const values = childValues
          .map((cv: CellValue) => Number(cv.value))
          .filter((v: number) => !isNaN(v) && v !== null);
        aggregatedValue =
          values.length > 0
            ? values.reduce((a: number, b: number) => a + b, 0) / values.length
            : null;
        break;
      }

      case 'WEIGHTED_AVG': {
        if (!measure.weight_measure_id) {
          const values = childValues
            .map((cv: CellValue) => Number(cv.value))
            .filter((v: number) => !isNaN(v) && v !== null);
          aggregatedValue =
            values.length > 0
              ? values.reduce((a: number, b: number) => a + b, 0) / values.length
              : null;
          break;
        }

        const weightValues = await trx('cell_values')
          .whereIn('node_id', siblingIds)
          .where({
            measure_id: measure.weight_measure_id,
            time_period_id: timePeriodId,
            version_id: versionId,
          });

        const weightMap = new Map<number, number>();
        for (const wv of weightValues) {
          if (wv.value !== null) {
            weightMap.set(wv.node_id, Number(wv.value));
          }
        }

        let sumWeightedValues = 0;
        let sumWeights = 0;

        for (const cv of childValues) {
          const numVal = Number(cv.value);
          if (cv.value !== null && !isNaN(numVal)) {
            const weight = weightMap.get(cv.node_id) ?? 0;
            sumWeightedValues += numVal * weight;
            sumWeights += weight;
          }
        }

        aggregatedValue =
          sumWeights > 0 ? sumWeightedValues / sumWeights : null;
        break;
      }

      case 'NONE':
      default:
        return;
    }

    // Save the aggregated value for the parent
    await upsertCellValue(
      trx,
      parentId,
      measure.id,
      timePeriodId,
      aggregatedValue,
      versionId
    );

    // Continue up to the next ancestor
    await this.aggregateNodeUp(trx, parentId, measure, timePeriodId, versionId);
  }

  /**
   * Recursively aggregate time periods upward.
   */
  private async aggregateTimePeriodUp(
    trx: any,
    nodeId: number,
    measure: Measure,
    timePeriodId: number,
    versionId: number
  ): Promise<void> {
    // Find the parent time period
    const period = await trx('time_periods')
      .where({ id: timePeriodId })
      .first();

    if (!period || period.parent_id === null) return;

    const parentPeriodId = period.parent_id;

    // Get all sibling time periods (children of the parent period)
    const siblingPeriods = await trx('time_periods')
      .where({ parent_id: parentPeriodId });

    const siblingPeriodIds = siblingPeriods.map((p: TimePeriod) => p.id);

    // Load values for all sibling time periods
    const childValues = await trx('cell_values')
      .where({
        node_id: nodeId,
        measure_id: measure.id,
        version_id: versionId,
      })
      .whereIn('time_period_id', siblingPeriodIds);

    let aggregatedValue: number | null = null;

    const values = childValues
      .map((cv: CellValue) => Number(cv.value))
      .filter((v: number) => !isNaN(v) && v !== null);

    switch (measure.aggregation_type) {
      case 'SUM':
        aggregatedValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) : null;
        break;

      case 'AVG':
      case 'WEIGHTED_AVG':
        // For time period aggregation, weighted avg falls back to simple average
        aggregatedValue =
          values.length > 0
            ? values.reduce((a, b) => a + b, 0) / values.length
            : null;
        break;

      case 'NONE':
      default:
        return;
    }

    await upsertCellValue(
      trx,
      nodeId,
      measure.id,
      parentPeriodId,
      aggregatedValue,
      versionId
    );

    // Continue up to the next parent period
    await this.aggregateTimePeriodUp(
      trx,
      nodeId,
      measure,
      parentPeriodId,
      versionId
    );
  }
}

export const aggregationService = new AggregationService();
