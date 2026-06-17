import type {
  LoginRequest,
  LoginResponse,
  UserProfileResponse,
} from '../../types/index.types';

import { apiFetch } from './apiClient';

export const login = (credentials: LoginRequest) =>
  apiFetch<LoginResponse>('/users/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

export const getCurrentUser = () =>
  apiFetch<UserProfileResponse>('/users/me', {
    method: 'GET',
  });

export const getSessionCsrfToken = () =>
  apiFetch<{ csrfToken: string }>('/users/csrf', {
    method: 'GET',
  });

export const logout = () =>
  apiFetch<void>('/users/logout', {
    method: 'POST',
  });
