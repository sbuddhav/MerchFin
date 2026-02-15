import apiClient from './client';
import type { CellUpdateRequest } from '../types';

export const gridDataApi = {
  loadData: (params?: { nodeId?: number; depth?: number; versionId?: number }) =>
    apiClient.get('/grid/data', { params }),
  updateCell: (data: CellUpdateRequest) =>
    apiClient.put('/grid/cell', data),
};
