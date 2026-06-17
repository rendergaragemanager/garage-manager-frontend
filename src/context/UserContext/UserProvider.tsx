import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  setCsrfToken,
  setUnauthorizedHandler,
  ApiError,
} from '../../services/api/apiClient';
import {
  getCurrentUser,
  getSessionCsrfToken,
  logout as logoutApi,
} from '../../services/api/auth.api';

import type { UserRole, UserSession } from './types';
import { UserActionsContext, UserDataContext } from './UserContext';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const loadSession = useCallback(async () => {
    try {
      const profile = await getCurrentUser();
      const { csrfToken } = await getSessionCsrfToken();

      setCsrfToken(csrfToken);

      // companyId siempre viene poblado como objeto desde /users/me
      const company = profile.companyId;

      setUser({
        role: profile.role as UserRole,
        userId: profile._id,
        email: profile.email,
        active: profile.active,
        companyId: company?._id,
        companyName: company?.name,
        companyDocument: company?.document,
        companyAddress: company?.address,
        companyPhone: company?.phone,
        name: profile.name,
        createdAt: profile.createdAt,
      });
    } catch (error) {
      setCsrfToken(null);
      if (!(error instanceof ApiError) || error.status !== 401) {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Registrar el handler de sesión expirada una sola vez
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const actions = useMemo(
    () => ({
      login: (nextUser: UserSession) => {
        setCsrfToken(nextUser.csrfToken ?? null);
        setUser(nextUser);
      },
      logout: async () => {
        try {
          await logoutApi();
        } finally {
          setCsrfToken(null);
          setUser(null);
        }
      },
      refreshUser: async () => {
        await loadSession();
      },
    }),
    [loadSession],
  );

  const data = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
    }),
    [user, isLoading],
  );

  return (
    <UserActionsContext.Provider value={actions}>
      <UserDataContext.Provider value={data}>{children}</UserDataContext.Provider>
    </UserActionsContext.Provider>
  );
}
