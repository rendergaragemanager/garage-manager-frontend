export interface CompanyAddress {
  street?: string;
  city?: string;
  zipCode?: string;
  country?: string;
}

export interface CompanyLogo {
  url: string;
  publicId: string;
}

export interface Company {
  _id: string;
  name: string;
  document?: string;
  phone?: string;
  address?: CompanyAddress;
  logo?: CompanyLogo;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}
