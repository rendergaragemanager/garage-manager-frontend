import { Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import SplashScreen from '../components/SplashScreen/SplashScreen';
import { useUserData } from '../context/UserContext/UserContext';
import AdminLayout from '../layouts/AdminLayout';
import MechanicLayout from '../layouts/MechanicLayout';
import CookiesPolicy from '../pages/CookiesPolicy/CookiesPolicy';
import Dashboard from '../pages/Dashboard/Dashboard';
import Login from '../pages/Login/Login';
import PrivacyPolicy from '../pages/PrivacyPolicy/PrivacyPolicy';
import Profile from '../pages/Profile/Profile';
import Budgets from '../views/Budgets/Budgets';
import Clients from '../views/Clients/Clients';
import Companies from '../views/Companies/Companies';
import Users from '../views/Users/Users';
import Vehicles from '../views/Vehicles/Vehicles';
import WorkOrderDetail from '../views/WorkOrderDetail/WorkOrderDetail';
import WorkOrders from '../views/WorkOrders/WorkOrders';

const AppRouter = () => {
  const { isAuthenticated, isLoading, user } = useUserData();
  const role = user?.role;

  const isNotMechanic =
    role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'ADMINISTRATIVE';

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Routes>
      {/* raíz */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/app" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="/login" element={<Login />} />

      <Route path="/politica-cookies" element={<CookiesPolicy />} />

      <Route path="/politica-privacidad" element={<PrivacyPolicy />} />

      {/* app protegida */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            {isNotMechanic ? <AdminLayout /> : <MechanicLayout />}
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            role === 'MECHANIC' ? (
              <Navigate to="ordenes-trabajo" replace />
            ) : (
              <Navigate to="inicio" replace />
            )
          }
        />

        <Route path="mi-perfil" element={<Profile />} />

        {/* administración */}
        <Route
          path="inicio"
          element={isNotMechanic ? <Dashboard /> : <Navigate to="/app" replace />}
        />
        <Route
          path="clientes"
          element={isNotMechanic ? <Clients /> : <Navigate to="/app" replace />}
        />
        <Route
          path="presupuestos"
          element={isNotMechanic ? <Budgets /> : <Navigate to="/app" replace />}
        />
        <Route
          path="albaranes"
          element={isNotMechanic ? <WorkOrders /> : <Navigate to="/app" replace />}
        />
        <Route
          path="albaranes/:id"
          element={isNotMechanic ? <WorkOrderDetail /> : <Navigate to="/app" replace />}
        />
        <Route
          path="vehiculos"
          element={isNotMechanic ? <Vehicles /> : <Navigate to="/app" replace />}
        />

        {/* Usuarios: ADMIN y ADMINISTRATIVE */}
        <Route
          path="usuarios"
          element={
            role === 'ADMIN' || role === 'ADMINISTRATIVE' ? (
              <Users />
            ) : (
              <Navigate to="/app" replace />
            )
          }
        />

        {/* Empresas: exclusivo SUPER_ADMIN */}
        <Route
          path="empresas"
          element={
            role === 'SUPER_ADMIN' ? <Companies /> : <Navigate to="/app" replace />
          }
        />

        <Route path="mecanicos" element={<Navigate to="/app/usuarios" replace />} />

        {/* mecánico */}
        <Route
          path="ordenes-trabajo"
          element={role === 'MECHANIC' ? <WorkOrders /> : <Navigate to="/app" replace />}
        />
        <Route
          path="ordenes-trabajo/:id"
          element={
            role === 'MECHANIC' ? <WorkOrderDetail /> : <Navigate to="/app" replace />
          }
        />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
