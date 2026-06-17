import type { Client, ClientsResponse, GetClientsQuery } from '../../types/client.types';

import { apiFetch } from './apiClient';

export const getClients = (params?: GetClientsQuery) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.includeInactive !== undefined)
    queryParams.append('includeInactive', String(params.includeInactive));
  if (params?.inactive !== undefined)
    queryParams.append('inactive', String(params.inactive));
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  const queryString = queryParams.toString();
  return apiFetch<ClientsResponse>(`/clients${queryString ? `?${queryString}` : ''}`);
};

export const createClient = (
  clientData: Omit<Client, '_id' | 'createdAt' | 'companyId'>,
) =>
  apiFetch<Client>('/clients', {
    method: 'POST',
    body: JSON.stringify(clientData),
  });

export const updateClient = (id: string, clientData: Partial<Client>) =>
  apiFetch<Client>(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(clientData),
  });

export const deleteClient = (id: string) =>
  apiFetch<{ message: string }>(`/clients/${id}/deactivate`, {
    method: 'PATCH',
  });

export const activateClient = (id: string) =>
  apiFetch<{ message: string }>(`/clients/${id}/activate`, {
    method: 'PATCH',
  });
