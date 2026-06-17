export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ADMINISTRATIVE' | 'MECHANIC';

/**
 * Forma populada de companyId cuando el backend devuelve el objeto completo
 * en lugar de solo el ID (p.ej. en listados con populate).
 */
export interface PopulatedCompany {
  _id: string;
  name: string;
  document?: string;
  active: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string | PopulatedCompany;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const resolveCompanyId = (companyId: User['companyId']): string | undefined => {
  if (!companyId) return undefined;
  if (typeof companyId === 'object') return companyId._id;
  return companyId;
};
