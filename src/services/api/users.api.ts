import type { User } from '../../types/user.types';

import { apiFetch } from './apiClient';

interface GetUsersResponse {
  users: User[];
  pagination?: {
    totalData: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

interface GetMechanicsResponse {
  mechanics: User[];
  pagination?: {
    totalData: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

type CreateUserRequest = {
  name: string;
  email: string;
  password?: string;
  role: User['role'];
  companyId?: string;
  companyName?: string;
  companyDocument?: string;
};

type UpdateUserRequest = {
  name?: string;
  email?: string;
  password?: string;
  currentPassword?: string;
  active?: boolean;
  companyName?: string;
  companyDocument?: string;
};

export const getUsers = (params?: {
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

export const createUser = (data: CreateUserRequest) => {
  return apiFetch<{ message: string; user: User }>('/users/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateUser = (id: string, data: UpdateUserRequest) => {
  return apiFetch<{ message: string; user: User }>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deactivateUser = (id: string) => {
  return apiFetch<{ message: string }>(`/users/${id}/deactivate`, {
    method: 'PATCH',
  });
};

export const activateUser = (id: string) => {
  return apiFetch<{ message: string }>(`/users/${id}/activate`, {
    method: 'PATCH',
  });
};

export const getMechanics = (params?: { page?: number; limit?: number }) => {
  let url = '/users/mechanics';
  if (params) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    const queryString = query.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return apiFetch<GetMechanicsResponse>(url);
};

export const getAdministratives = () =>
  apiFetch<{ administratives: User[] }>('/users/administratives');
