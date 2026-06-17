import type { Budget, BudgetsResponse, GetBudgetsQuery } from '../../types/budget.types';

import { apiFetch } from './apiClient';

export const getBudgets = (params?: GetBudgetsQuery) => {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.status) query.append('status', params.status);
  if (params?.clientId) query.append('clientId', params.clientId);
  if (params?.vehicleId) query.append('vehicleId', params.vehicleId);
  if (params?.includeInactive) query.append('includeInactive', 'true');
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const queryString = query.toString();
  return apiFetch<BudgetsResponse>(`/budgets${queryString ? `?${queryString}` : ''}`);
};

export const getBudgetById = (id: string) => apiFetch<Budget>(`/budgets/${id}`);

export const createBudget = (budgetData: Partial<Budget>) =>
  apiFetch<Budget>('/budgets', {
    method: 'POST',
    body: JSON.stringify(budgetData),
  });

export const updateBudget = (id: string, budgetData: Partial<Budget>) =>
  apiFetch<Budget>(`/budgets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(budgetData),
  });

export const deactivateBudget = (id: string) =>
  apiFetch<{ message: string }>(`/budgets/${id}/deactivate`, {
    method: 'PATCH',
  });

export const activateBudget = (id: string) =>
  apiFetch<{ message: string }>(`/budgets/${id}/activate`, {
    method: 'PATCH',
  });

export const acceptBudget = (id: string) =>
  apiFetch<Budget>(`/budgets/${id}/accept`, {
    method: 'PATCH',
  });

export const rejectBudget = (id: string) =>
  apiFetch<Budget>(`/budgets/${id}/reject`, {
    method: 'PATCH',
  });
