import db from '../config/database';
import { Measure } from '../types/index';

export class MeasuresService {
  /**
   * Get all measures ordered by sort_order ascending.
   */
  async getAll(): Promise<Measure[]> {
    return db<Measure>('measures').orderBy('sort_order', 'asc');
  }

  /**
   * Create a new measure.
   */
  async create(data: {
    name: string;
    short_name: string;
    data_type: Measure['data_type'];
    is_editable?: boolean;
    formula?: string | null;
    aggregation_type?: Measure['aggregation_type'];
    weight_measure_id?: number | null;
    sort_order?: number;
    format_pattern?: string | null;
    bg_color?: string | null;
  }): Promise<Measure> {
    // If no sort_order provided, place it at the end
    if (data.sort_order === undefined) {
      const last = await db<Measure>('measures')
        .max('sort_order as max_order')
        .first();
      data.sort_order = ((last as any)?.max_order ?? -1) + 1;
    }

    const [measure] = await db<Measure>('measures')
      .insert({
        name: data.name,
        short_name: data.short_name,
        data_type: data.data_type,
        is_editable: data.is_editable ?? true,
        formula: data.formula ?? null,
        aggregation_type: data.aggregation_type ?? 'SUM',
        weight_measure_id: data.weight_measure_id ?? null,
        sort_order: data.sort_order,
        format_pattern: data.format_pattern ?? null,
        bg_color: data.bg_color ?? null,
      })
      .returning('*');

    return measure;
  }

  /**
   * Update an existing measure by id.
   */
  async update(
    id: number,
    data: Partial<
      Pick<
        Measure,
        | 'name'
        | 'short_name'
        | 'data_type'
        | 'is_editable'
        | 'formula'
        | 'aggregation_type'
        | 'weight_measure_id'
        | 'sort_order'
        | 'format_pattern'
        | 'bg_color'
      >
    >
  ): Promise<Measure> {
    const [measure] = await db<Measure>('measures')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');

    if (!measure) {
      throw new Error(`Measure with id ${id} not found`);
    }

    return measure;
  }

  /**
   * Delete a measure by id.
   * Also removes any cell_values that reference this measure.
   */
  async delete(id: number): Promise<void> {
    const exists = await db<Measure>('measures').where({ id }).first();

    if (!exists) {
      throw new Error(`Measure with id ${id} not found`);
    }

    await db.transaction(async (trx) => {
      await trx('cell_values').where({ measure_id: id }).del();
      await trx('measures').where({ id }).del();
    });
  }

  /**
   * Reorder measures by providing an ordered array of measure ids.
   * The position in the array becomes the new sort_order.
   */
  async reorder(orderedIds: number[]): Promise<Measure[]> {
    await db.transaction(async (trx) => {
      const updates = orderedIds.map((id, index) =>
        trx<Measure>('measures')
          .where({ id })
          .update({ sort_order: index, updated_at: db.fn.now() })
      );

      await Promise.all(updates);
    });

    return this.getAll();
  }
}

export const measuresService = new MeasuresService();
