import type { Client } from './client.types';
import type { Vehicle } from './vehicle.types';

export const BudgetStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
} as const;

export type BudgetStatus = (typeof BudgetStatus)[keyof typeof BudgetStatus];

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
};

export interface BudgetItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
}

export const SERVICE_TYPES = ['MAINTENANCE', 'REPAIR', 'ITV', 'OTHER'] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  MAINTENANCE: 'MANTENIMIENTO',
  REPAIR: 'REPARACIÓN',
  ITV: 'ITV',
  OTHER: 'OTRO',
};

export interface Budget {
  _id: string;
  companyId: string;
  budgetNumber?: string;
  vehicle: string | Vehicle;
  client: string | Client;
  status: BudgetStatus;
  serviceType: ServiceType;
  description: string;
  expirationDate?: string;
  items: BudgetItem[];
  total: number;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface BudgetsResponse {
  budgets: Budget[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetBudgetsQuery {
  search?: string;
  status?: BudgetStatus;
  clientId?: string;
  vehicleId?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}
