import type { Company, CompanyAddress, CompanyLogo } from '../../types/company.types';

import { apiFetch } from './apiClient';

export type { Company, CompanyAddress, CompanyLogo };

export interface GetCompaniesResponse {
  companies: Company[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateCompanyRequest {
  name: string;
  document: string;
  phone: string;
  address?: CompanyAddress;
  adminName: string;
  adminEmail: string;
  adminPassword?: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  document?: string;
  phone?: string;
  address?: CompanyAddress;
}

export const getCompanies = (params?: {
  search?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}) => {
  let url = '/companies';
  if (params) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.includeInactive) query.append('includeInactive', 'true');
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    if (qs) url += `?${qs}`;
  }
  return apiFetch<GetCompaniesResponse>(url);
};

export const getCompanyById = (id: string) =>
  apiFetch<{ company: Company }>(`/companies/${id}`);

export const createCompany = (data: CreateCompanyRequest) =>
  apiFetch<{
    message: string;
    company: Company;
    admin: { _id: string; name: string; email: string };
  }>('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateCompany = (id: string, data: UpdateCompanyRequest) =>
  apiFetch<{ message: string; company: Company }>(`/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const updateCompanyLogo = (id: string, logoData: FormData) =>
  apiFetch<{ message: string; logo: CompanyLogo }>(`/companies/${id}/logo`, {
    method: 'PATCH',
    body: logoData,
  });

export const deactivateCompany = (id: string) =>
  apiFetch<{ message: string }>(`/companies/${id}/deactivate`, { method: 'PATCH' });

export const activateCompany = (id: string) =>
  apiFetch<{ message: string }>(`/companies/${id}/activate`, { method: 'PATCH' });
