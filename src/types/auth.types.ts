export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  user: AuthUserResponse;
  csrfToken: string;
};

export type AuthUserResponse = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  companyId?: UserCompanyResponse | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type UserCompanyResponse = {
  _id: string;
  name: string;
  document?: string;
  active?: boolean;
  address?: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
  phone?: string;
  logo?: {
    url: string;
    publicId: string;
  };
};

export type UserProfileResponse = {
  _id: string;
  name: string;
  email: string;
  role: string;
  active?: boolean;
  companyId: UserCompanyResponse;
  createdAt?: string;
  updatedAt?: string;
};
