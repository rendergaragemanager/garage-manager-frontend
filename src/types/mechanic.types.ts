import type { UserCompanyResponse } from './auth.types';

export type UserRoleType = 'SUPER_ADMIN' | 'ADMIN' | 'MECHANIC' | 'ADMINISTRATIVE';

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN' as const,
  ADMIN: 'ADMIN' as const,
  MECHANIC: 'MECHANIC' as const,
  ADMINISTRATIVE: 'ADMINISTRATIVE' as const,
};

export type Mechanic = {
  _id: string;
  name: string;
  email: string;
  role: UserRoleType;
  companyId: string | UserCompanyResponse;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateMechanicRequest = {
  name: string;
  email: string;
  password?: string;
  role: UserRoleType;
  companyId?: string;
};

export type UpdateMechanicRequest = {
  name?: string;
  email?: string;
  password?: string;
  active?: boolean;
};
