import apiClient from './client';

export const hierarchyApi = {
  getLevels: () => apiClient.get('/hierarchy/levels'),
  createLevel: (name: string, depth: number) =>
    apiClient.post('/hierarchy/levels', { name, depth }),
  updateLevel: (id: number, name: string) =>
    apiClient.put(`/hierarchy/levels/${id}`, { name }),
  deleteLevel: (id: number) => apiClient.delete(`/hierarchy/levels/${id}`),
  getTree: () => apiClient.get('/hierarchy/nodes'),
  getSubtree: (id: number) => apiClient.get(`/hierarchy/nodes/${id}/subtree`),
  createNode: (data: { name: string; level_id: number; parent_id: number | null; sort_order?: number }) =>
    apiClient.post('/hierarchy/nodes', data),
  updateNode: (id: number, data: { name?: string; sort_order?: number }) =>
    apiClient.put(`/hierarchy/nodes/${id}`, data),
  deleteNode: (id: number) => apiClient.delete(`/hierarchy/nodes/${id}`),
};
