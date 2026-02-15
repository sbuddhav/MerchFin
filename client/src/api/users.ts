import apiClient from './client';

export const usersApi = {
  getAll: () => apiClient.get('/users'),
  create: (data: { email: string; password: string; name: string; role: string }) =>
    apiClient.post('/users', data),
  update: (id: number, data: { email?: string; name?: string; role?: string; password?: string }) =>
    apiClient.put(`/users/${id}`, data),
  delete: (id: number) => apiClient.delete(`/users/${id}`),
  updateAssignments: (id: number, nodeIds: number[]) =>
    apiClient.put(`/users/${id}/assignments`, { nodeIds }),
};
