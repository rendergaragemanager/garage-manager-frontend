import type { Client } from './client.types';

export type Vehicle = {
  _id: string;
  plate: string;
  brand: string;
  model: string;
  client: string | Client;
  companyId: string;
  active: boolean;
  year?: number;
  kms?: number;
  nextRevision?: string;
  createdAt: string;
  image?: {
    url: string;
    publicId: string;
  };
};

export type VehiclesResponse = {
  vehicles: Vehicle[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type GetVehiclesQuery = {
  search?: string;
  clientId?: string;
  includeInactive?: boolean;
  inactive?: boolean;
  page?: number;
  limit?: number;
};
