import type {
  GetVehiclesQuery,
  Vehicle,
  VehiclesResponse,
} from '../../types/vehicle.types';

import { apiFetch } from './apiClient';

export const getVehicles = (params?: GetVehiclesQuery) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.clientId) queryParams.append('clientId', params.clientId);
  if (params?.includeInactive !== undefined)
    queryParams.append('includeInactive', String(params.includeInactive));
  if (params?.inactive !== undefined)
    queryParams.append('inactive', String(params.inactive));
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  const queryString = queryParams.toString();
  return apiFetch<VehiclesResponse>(`/vehicles${queryString ? `?${queryString}` : ''}`);
};

export const getVehicleById = (id: string) => apiFetch<Vehicle>(`/vehicles/${id}`);

export const createVehicle = (vehicleData: Partial<Vehicle> | FormData) =>
  apiFetch<{ message: string; vehicle: Vehicle }>('/vehicles', {
    method: 'POST',
    body: vehicleData instanceof FormData ? vehicleData : JSON.stringify(vehicleData),
  });

export const updateVehicle = (id: string, vehicleData: Partial<Vehicle>) =>
  apiFetch<{ message: string; vehicle: Vehicle }>(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(vehicleData),
  });

export const updateVehicleImage = (id: string, imageData: FormData) =>
  apiFetch<{ message: string; image: { url: string; publicId: string } }>(
    `/vehicles/${id}/image`,
    {
      method: 'PATCH',
      body: imageData,
    },
  );

export const deactivateVehicle = (id: string) =>
  apiFetch<{ message: string; vehicle: Vehicle }>(`/vehicles/${id}/deactivate`, {
    method: 'PATCH',
  });

export const activateVehicle = (id: string) =>
  apiFetch<{ message: string; vehicle: Vehicle }>(`/vehicles/${id}/activate`, {
    method: 'PATCH',
  });
