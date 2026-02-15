import apiClient from './client';
import type { Measure } from '../types';

export const measuresApi = {
  getAll: () => apiClient.get('/measures'),
  create: (data: Partial<Measure>) => apiClient.post('/measures', data),
  update: (id: number, data: Partial<Measure>) => apiClient.put(`/measures/${id}`, data),
  delete: (id: number) => apiClient.delete(`/measures/${id}`),
  reorder: (orderedIds: number[]) => apiClient.put('/measures/reorder', { orderedIds }),
  updateColor: (id: number, bg_color: string | null) => apiClient.put(`/measures/${id}/color`, { bg_color }),
};
