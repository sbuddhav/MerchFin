import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index';
import { timePeriodsService } from '../services/timePeriods.service';

/**
 * GET /api/time-periods/config
 * Retrieve the current time configuration.
 */
export async function getConfig(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const config = await timePeriodsService.getConfig();
    res.json(config);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/time-periods/config
 * Update the time configuration (granularity and fiscal year start month).
 */
export async function updateConfig(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { granularity, fiscalYearStartMonth } = req.body;

    if (!granularity || !fiscalYearStartMonth) {
      res.status(400).json({ error: 'Granularity and fiscalYearStartMonth are required' });
      return;
    }

    const config = await timePeriodsService.updateConfig(granularity, fiscalYearStartMonth);
    res.json(config);
  } catch (error: any) {
    if (error.message?.includes('must be between')) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/time-periods
 * Retrieve all time periods as a nested tree.
 */
export async function getPeriods(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const periods = await timePeriodsService.getPeriods();
    res.json(periods);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/time-periods/generate
 * Auto-generate time periods for a date range.
 */
export async function generatePeriods(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate, granularity } = req.body;

    if (!startDate || !endDate || !granularity) {
      res.status(400).json({ error: 'startDate, endDate, and granularity are required' });
      return;
    }

    const periods = await timePeriodsService.generatePeriods(startDate, endDate, granularity);
    res.status(201).json(periods);
  } catch (error: any) {
    if (error.message?.includes('Invalid') || error.message?.includes('must be before')) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
}
