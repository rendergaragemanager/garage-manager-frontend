export type Client = {
  _id: string;
  name: string;
  documentNumber?: string;
  telephone?: string;
  email?: string;
  active: boolean;
  companyId: string;
  clientNumber?: number;
  address?: {
    street?: string;
    city?: string;
    zipCode?: string;
    country?: string;
  };
  createdAt: string;
};

export type ClientsResponse = {
  clients: Client[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type GetClientsQuery = {
  search?: string;
  includeInactive?: boolean;
  inactive?: boolean;
  page?: number;
  limit?: number;
};
