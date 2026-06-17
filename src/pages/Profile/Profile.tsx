import { Wrench, Edit3, Key } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import CompanyModal from '../../components/modals/company/CompanyModal';
import ChangePasswordModal from '../../components/modals/users/ChangePasswordModal';
import PageShell from '../../components/PageShell/PageShell';
import ProfileStats from '../../components/ProfileStats/ProfileStats';
import { useUser } from '../../context/UserContext/UserContext';
import { getWorkOrders } from '../../services/api/workOrders.api';
import type { WorkOrder } from '../../types/workOrder.types';

import './Profile.css';

const Profile = () => {
  const { user, refreshUser } = useUser();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const userInitial = user ? `${user.name?.charAt(0)}` : 'U';
  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Administrador',
    ADMINISTRATIVE: 'Administrativo',
    MECHANIC: 'Mecánico',
  };

  const loadWorkOrders = useCallback(async () => {
    if (user?.role === 'SUPER_ADMIN') {
      setLoadingStats(false);
      return;
    }

    try {
      setLoadingStats(true);
      const pageSize = 100;
      let page = 1;
      let totalPages = 1;
      const allOrders: WorkOrder[] = [];

      do {
        const res = await getWorkOrders({ page, limit: pageSize });
        allOrders.push(...(res.workOrders ?? []));
        totalPages = res?.pagination?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages);

      const uniqueById = new Map<string, WorkOrder>();
      allOrders.forEach((order) => {
        uniqueById.set(order._id, order);
      });

      setOrders(Array.from(uniqueById.values()));
    } catch (error) {
      console.error('Error loading profile stats', error);
      setOrders([]);
    } finally {
      setLoadingStats(false);
    }
  }, [user?.role]);

  useEffect(() => {
    void loadWorkOrders();
  }, [loadWorkOrders]);

  const isAdmin = user?.role === 'ADMIN';

  const profileHeader = (
    <section className="profile-header-card">
      <div className="profile-avatar">{userInitial || 'U'}</div>
      <div className="profile-header-info">
        <h1 className="profile-name">{user?.name || 'Usuario'}</h1>
        <div className="profile-role-badge">
          <Wrench size={12} strokeWidth={2.4} />
          <span>{user?.role ? roleLabel[user.role] || user.role : 'USUARIO'}</span>
        </div>
      </div>
    </section>
  );

  return (
    <PageShell header={profileHeader}>
      <div className="profile-page">
        <div className="profile-content-grid">
          {/* User Info Section - STATIC */}
          <section className="profile-section-card">
            <div className="profile-section-header">
              <h2 className="profile-section-title">Datos Personales</h2>
              <button
                type="button"
                className="profile-edit-btn"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                <Key size={16} />
                <span>Contraseña</span>
              </button>
            </div>
            <div className="profile-form-grid">
              <div className="profile-form-group">
                <label className="profile-form-label">Nombre Completo</label>
                <div className="profile-static-value">{user?.name}</div>
              </div>
              <div className="profile-form-group">
                <label className="profile-form-label">Email de Acceso</label>
                <div className="profile-static-value">{user?.email}</div>
              </div>
              <div className="profile-form-group">
                <label className="profile-form-label">Miembro desde</label>
                <div className="profile-static-value">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '-'}
                </div>
              </div>
            </div>
          </section>

          {/* Company Info Section - STATIC VIEW */}
          <section className="profile-section-card">
            <div className="profile-section-header">
              <h2 className="profile-section-title">Información de Empresa</h2>
              {isAdmin && (
                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={() => setIsCompanyModalOpen(true)}
                >
                  <Edit3 size={16} />
                  <span>Editar</span>
                </button>
              )}
            </div>
            <div className="profile-form-grid">
              <div className="profile-form-group profile-form-group--full">
                <label className="profile-form-label">Nombre Comercial</label>
                <div className="profile-static-value">
                  {user?.companyName || 'No disponible'}
                </div>
              </div>
              <div className="profile-form-row">
                <div className="profile-form-group">
                  <label className="profile-form-label">CIF / NIF</label>
                  <div className="profile-static-value">
                    {user?.companyDocument || 'No disponible'}
                  </div>
                </div>
                <div className="profile-form-group">
                  <label className="profile-form-label">Teléfono</label>
                  <div className="profile-static-value">
                    {user?.companyPhone || 'No disponible'}
                  </div>
                </div>
              </div>
              <div className="profile-form-group profile-form-group--full">
                <label className="profile-form-label">Dirección Fiscal</label>
                <div className="profile-static-value">
                  {user?.companyAddress?.street}
                  {user?.companyAddress?.city && `, ${user.companyAddress.city}`}
                  {user?.companyAddress?.zipCode && ` (${user.companyAddress.zipCode})`}
                  {!user?.companyAddress?.street && 'No disponible'}
                </div>
              </div>
            </div>
          </section>
        </div>

        {user?.role !== 'SUPER_ADMIN' && (
          <ProfileStats role={user?.role} orders={orders} loading={loadingStats} />
        )}

        {/* Company Edit Modal */}
        {isAdmin && user?.companyId && (
          <CompanyModal
            isOpen={isCompanyModalOpen}
            onClose={() => setIsCompanyModalOpen(false)}
            onSaved={refreshUser}
            companyData={{
              id: user.companyId,
              name: user.companyName || '',
              document: user.companyDocument || '',
              phone: user.companyPhone || '',
              address: user.companyAddress
                ? {
                    street: user.companyAddress.street || '',
                    city: user.companyAddress.city || '',
                    zipCode: user.companyAddress.zipCode || '',
                    country: user.companyAddress.country || '',
                  }
                : undefined,
            }}
          />
        )}

        {/* Change Password Modal */}
        {user?.userId && (
          <ChangePasswordModal
            isOpen={isPasswordModalOpen}
            userId={user.userId}
            onClose={() => setIsPasswordModalOpen(false)}
            onSaved={() => {
              // The modal handles its own success UI
            }}
          />
        )}
      </div>
    </PageShell>
  );
};

export default Profile;
