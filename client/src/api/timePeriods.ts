import apiClient from './client';

export const timePeriodsApi = {
  getConfig: () => apiClient.get('/time-periods/config'),
  updateConfig: (granularity: string, fiscalYearStartMonth: number) =>
    apiClient.put('/time-periods/config', { granularity, fiscalYearStartMonth }),
  getPeriods: () => apiClient.get('/time-periods'),
  generatePeriods: (startDate: string, endDate: string, granularity: string) =>
    apiClient.post('/time-periods/generate', { startDate, endDate, granularity }),
};
