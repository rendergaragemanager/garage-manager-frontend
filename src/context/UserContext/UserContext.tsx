import { createContext, useContext } from 'react';

import type { UserActionsValue, UserDataValue } from './types';

export const UserDataContext = createContext<UserDataValue | undefined>(undefined);
export const UserActionsContext = createContext<UserActionsValue | undefined>(undefined);

export function useUserData() {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error('useUserData must be used within UserProvider');
  return ctx;
}

export function useUserActions() {
  const ctx = useContext(UserActionsContext);
  if (!ctx) throw new Error('useUserActions must be used within UserProvider');
  return ctx;
}

export function useUser() {
  return { ...useUserData(), ...useUserActions() };
}
