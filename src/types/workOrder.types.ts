export type WorkOrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DELIVERED';

export type WorkOrderServiceType = 'MAINTENANCE' | 'REPAIR' | 'ITV' | 'OTHER';

export type WorkOrder = {
  _id: string;
  description: string;
  status: WorkOrderStatus;
  serviceType: WorkOrderServiceType;
  companyId: string;
  kms?: number;
  entryDate?: string;
  deliveryDate?: string;
  createdAt: string;
  client: {
    _id: string;
    name: string;
    telephone?: string;
    email?: string;
  };
  vehicle: {
    _id: string;
    plate: string;
    brand: string;
    model: string;
    kms?: number;
  };
  mechanic: {
    _id: string;
    name: string;
  } | null;
  items: [
    {
      description: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    },
  ];
  workOrderNumber?: string;
  total: number;
};

export type WorkOrdersResponse = {
  workOrders: WorkOrder[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type GetWorkOrdersQuery = {
  search?: string;
  status?: WorkOrderStatus;
  client?: string;
  vehicle?: string;
  mechanic?: string;
  page?: number;
  limit?: number;
};
