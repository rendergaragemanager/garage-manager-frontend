import type {
  GetWorkOrdersQuery,
  WorkOrder,
  WorkOrderServiceType,
  WorkOrdersResponse,
} from '../../types/workOrder.types';

import { apiFetch } from './apiClient';

type WorkOrderMutationResponse = {
  message?: string;
  workOrder: WorkOrder;
};

type UpdateWorkOrderPayload = {
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
};

type UpdateWorkOrderStatusPayload = {
  status: WorkOrder['status'];
  kms?: number;
  mechanic?: string;
};

type CreateWorkOrderPayload = {
  client: string;
  vehicle: string;
  serviceType: WorkOrderServiceType;
  description: string;
  mechanic?: string;
  kms?: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
};

export const getWorkOrders = (params?: GetWorkOrdersQuery) => {
  let url = '/work-orders';
  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    const queryString = query.toString();
    if (queryString) url += `?${queryString}`;
  }
  return apiFetch<WorkOrdersResponse>(url);
};

export const getWorkOrderById = (id: string) => apiFetch<WorkOrder>(`/work-orders/${id}`);

export const updateWorkOrder = (id: string, payload: UpdateWorkOrderPayload) =>
  apiFetch<WorkOrderMutationResponse>(`/work-orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const updateWorkOrderStatus = (
  id: string,
  payload: UpdateWorkOrderStatusPayload,
) =>
  apiFetch<WorkOrderMutationResponse>(`/work-orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const createWorkOrder = (workOrderData: CreateWorkOrderPayload) =>
  apiFetch<WorkOrder>('/work-orders', {
    method: 'POST',
    body: JSON.stringify(workOrderData),
  });
