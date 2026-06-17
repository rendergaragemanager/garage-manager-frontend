export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ADMINISTRATIVE' | 'MECHANIC';

export interface Address {
  street: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface UserSession {
  role: UserRole;
  userId: string;
  email: string;
  active?: boolean;
  companyId?: string;
  companyName?: string;
  companyDocument?: string;
  companyAddress?: Address;
  companyPhone?: string;
  name?: string;
  createdAt?: string;
  csrfToken?: string;
}

export interface UserDataValue {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface UserActionsValue {
  login: (nextUser: UserSession) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
