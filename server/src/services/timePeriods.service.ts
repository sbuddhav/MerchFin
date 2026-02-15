import db from '../config/database';
import { TimeConfig, TimePeriod } from '../types/index';

export class TimePeriodsService {
  // ──────────────────────────────────────────────
  //  Time Configuration
  // ──────────────────────────────────────────────

  /**
   * Get the current time configuration (granularity, fiscal year start).
   */
  async getConfig(): Promise<TimeConfig> {
    const config = await db<TimeConfig>('time_config').first();

    if (!config) {
      // Return a sensible default if no config row exists
      const [created] = await db<TimeConfig>('time_config')
        .insert({
          granularity: 'month',
          fiscal_year_start_month: 1,
        })
        .returning('*');
      return created;
    }

    return config;
  }

  /**
   * Update granularity and/or fiscal year start month.
   */
  async updateConfig(
    granularity: TimeConfig['granularity'],
    fiscalYearStartMonth: number
  ): Promise<TimeConfig> {
    if (fiscalYearStartMonth < 1 || fiscalYearStartMonth > 12) {
      throw new Error('fiscalYearStartMonth must be between 1 and 12');
    }

    const existing = await db<TimeConfig>('time_config').first();

    if (!existing) {
      const [config] = await db<TimeConfig>('time_config')
        .insert({
          granularity,
          fiscal_year_start_month: fiscalYearStartMonth,
        })
        .returning('*');
      return config;
    }

    const [config] = await db<TimeConfig>('time_config')
      .where({ id: existing.id })
      .update({
        granularity,
        fiscal_year_start_month: fiscalYearStartMonth,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return config;
  }

  // ──────────────────────────────────────────────
  //  Time Periods
  // ──────────────────────────────────────────────

  /**
   * Get all time periods as a nested tree.
   * Root periods (parent_id IS NULL) are the top of the tree.
   */
  async getPeriods(): Promise<TimePeriod[]> {
    const rows = await db<TimePeriod>('time_periods')
      .orderBy('depth', 'asc')
      .orderBy('sort_order', 'asc')
      .orderBy('start_date', 'asc');

    return this.buildTimePeriodTree(rows);
  }

  /**
   * Get only the leaf-level time periods (those with no children).
   */
  async getLeafPeriods(): Promise<TimePeriod[]> {
    return db<TimePeriod>('time_periods')
      .whereNotIn(
        'id',
        db('time_periods')
          .select('parent_id')
          .whereNotNull('parent_id')
      )
      .orderBy('sort_order', 'asc')
      .orderBy('start_date', 'asc');
  }

  /**
   * Auto-generate time periods for a date range based on the chosen granularity.
   * Creates year → quarter → month / week hierarchy as appropriate.
   */
  async generatePeriods(
    startDate: string,
    endDate: string,
    granularity: 'week' | 'month' | 'quarter'
  ): Promise<TimePeriod[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid start or end date');
    }
    if (start >= end) {
      throw new Error('startDate must be before endDate');
    }

    // Clear existing periods before regenerating
    await db.transaction(async (trx) => {
      await trx('cell_values').del();
      await trx('time_periods').del();

      let sortCounter = 0;

      // Gather the set of years spanned
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();

      for (let year = startYear; year <= endYear; year++) {
        // Create the year-level period
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);

        const [yearPeriod] = await trx('time_periods')
          .insert({
            label: `FY ${year}`,
            start_date: this.clampDate(yearStart, start, end),
            end_date: this.clampDate(yearEnd, start, end),
            parent_id: null,
            depth: 0,
            sort_order: sortCounter++,
          })
          .returning('*');

        if (granularity === 'quarter' || granularity === 'month') {
          await this.generateQuarters(
            trx,
            year,
            yearPeriod.id,
            start,
            end,
            granularity,
            sortCounter
          );
          // Advance sortCounter past generated children
          sortCounter += granularity === 'month' ? 16 : 4;
        }

        if (granularity === 'week') {
          await this.generateWeeks(
            trx,
            year,
            yearPeriod.id,
            start,
            end,
            sortCounter
          );
          sortCounter += 54; // max weeks in a year + buffer
        }
      }
    });

    return this.getPeriods();
  }

  // ──────────────────────────────────────────────
  //  Private helpers
  // ──────────────────────────────────────────────

  /**
   * Generate quarterly periods for a given year.
   * If granularity is 'month', also generates months under each quarter.
   */
  private async generateQuarters(
    trx: any,
    year: number,
    yearPeriodId: number,
    globalStart: Date,
    globalEnd: Date,
    granularity: 'quarter' | 'month',
    baseSortOrder: number
  ): Promise<void> {
    const quarterMonths = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [9, 10, 11],
    ];

    let sortOrder = baseSortOrder;

    for (let q = 0; q < 4; q++) {
      const qStart = new Date(year, quarterMonths[q][0], 1);
      const qEnd = new Date(year, quarterMonths[q][2] + 1, 0); // last day of quarter

      // Skip quarters entirely outside the requested range
      if (qEnd < globalStart || qStart > globalEnd) continue;

      const [quarterPeriod] = await trx('time_periods')
        .insert({
          label: `Q${q + 1} ${year}`,
          start_date: this.clampDate(qStart, globalStart, globalEnd),
          end_date: this.clampDate(qEnd, globalStart, globalEnd),
          parent_id: yearPeriodId,
          depth: 1,
          sort_order: sortOrder++,
        })
        .returning('*');

      if (granularity === 'month') {
        for (const month of quarterMonths[q]) {
          const mStart = new Date(year, month, 1);
          const mEnd = new Date(year, month + 1, 0);

          if (mEnd < globalStart || mStart > globalEnd) continue;

          const monthLabel = mStart.toLocaleString('en-US', { month: 'short' });

          await trx('time_periods')
            .insert({
              label: `${monthLabel} ${year}`,
              start_date: this.clampDate(mStart, globalStart, globalEnd),
              end_date: this.clampDate(mEnd, globalStart, globalEnd),
              parent_id: quarterPeriod.id,
              depth: 2,
              sort_order: sortOrder++,
            });
        }
      }
    }
  }

  /**
   * Generate weekly periods for a given year under the year-level period.
   */
  private async generateWeeks(
    trx: any,
    year: number,
    yearPeriodId: number,
    globalStart: Date,
    globalEnd: Date,
    baseSortOrder: number
  ): Promise<void> {
    let sortOrder = baseSortOrder;

    // Start from the first Monday on or after Jan 1
    const jan1 = new Date(year, 0, 1);
    const dayOfWeek = jan1.getDay();
    const firstMonday = new Date(jan1);
    firstMonday.setDate(jan1.getDate() + ((8 - dayOfWeek) % 7));

    let weekStart = new Date(firstMonday);
    let weekNum = 1;

    while (weekStart.getFullYear() <= year && weekStart <= globalEnd) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      if (weekEnd < globalStart) {
        weekStart.setDate(weekStart.getDate() + 7);
        weekNum++;
        continue;
      }

      if (weekStart > globalEnd) break;

      await trx('time_periods')
        .insert({
          label: `W${weekNum} ${year}`,
          start_date: this.clampDate(weekStart, globalStart, globalEnd),
          end_date: this.clampDate(weekEnd, globalStart, globalEnd),
          parent_id: yearPeriodId,
          depth: 1,
          sort_order: sortOrder++,
        });

      weekStart.setDate(weekStart.getDate() + 7);
      weekNum++;
    }
  }

  /**
   * Clamp a date to [min, max].
   */
  private clampDate(date: Date, min: Date, max: Date): Date {
    if (date < min) return min;
    if (date > max) return max;
    return date;
  }

  /**
   * Convert a flat list of time periods into a nested tree.
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

export const timePeriodsService = new TimePeriodsService();
