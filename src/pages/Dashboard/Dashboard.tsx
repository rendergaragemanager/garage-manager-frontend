import { Navigate } from 'react-router-dom';

import { useUserData } from '../../context/UserContext/UserContext';

import AdminDashboard from './AdminDashboard/AdminDashboard';
import AdministrativeDashboard from './AdministrativeDashboard/AdministrativeDashboard';
import SuperAdminDashboard from './SuperAdminDashboard/SuperAdminDashboard';

const Dashboard = () => {
  const { user } = useUserData();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMINISTRATIVE') {
    return <AdministrativeDashboard />;
  }

  if (user.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  if (user.role === 'SUPER_ADMIN') {
    return <SuperAdminDashboard />;
  }

  return <div>Dashboard en construcción para rol: {user.role}</div>;
};

export default Dashboard;
