export interface CompanyAddress {
  street?: string;
  city?: string;
  zipCode?: string;
  country?: string;
}

export interface Company {
  _id: string;
  name: string;
  document?: string;
  phone?: string;
  address?: CompanyAddress;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}
