import type {
  Mechanic,
  CreateMechanicRequest,
  UpdateMechanicRequest,
} from '../../types/mechanic.types';

import { apiFetch } from './apiClient';

interface GetUsersResponse {
  users: Mechanic[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getMechanics = (params?: {
  search?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}) => {
  let url = '/users';
  if (params) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.includeInactive) query.append('includeInactive', 'true');
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    url += `?${query.toString()}`;
  }
  return apiFetch<GetUsersResponse>(url);
};

export const createMechanic = (data: CreateMechanicRequest) => {
  return apiFetch<{ message: string; user: Mechanic }>('/users/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateMechanic = (id: string, data: UpdateMechanicRequest) => {
  return apiFetch<{ message: string; user: Mechanic }>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deactivateMechanic = (id: string) => {
  return apiFetch<{ message: string }>(`/users/${id}/deactivate`, {
    method: 'PATCH',
  });
};

export const activateMechanic = (id: string) => {
  return apiFetch<{ message: string }>(`/users/${id}/activate`, {
    method: 'PATCH',
  });
};
