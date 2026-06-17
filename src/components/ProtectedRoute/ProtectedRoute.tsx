import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useUserData } from '../../context/UserContext/UserContext';

type Props = {
  children: ReactNode;
};

const ProtectedRoute = ({ children }: Props) => {
  const { isAuthenticated, isLoading } = useUserData();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
