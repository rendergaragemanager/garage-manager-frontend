import { Building2, Pencil, UsersRound, ToggleRight, ToggleLeft } from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import {
  DataList,
  type BadgeConfig,
  type ColumnDef,
  type RowAction,
} from '../../components/DataList/DataList';
import FilterStats, {
  type FilterStatsItem,
} from '../../components/FilterStats/FilterStats';
import CompanyModal from '../../components/modals/company/CompanyModal';
import CreateCompanyModal from '../../components/modals/company/CreateCompanyModal';
import ConfirmModal from '../../components/modals/ConfirmModal';
import PersonnelModal, {
  type PersonnelRoleFilter,
} from '../../components/modals/users/PersonnelModal';
import UserModal from '../../components/modals/users/UserModal';
import PageShell from '../../components/PageShell/PageShell';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import SearchBar from '../../components/SearchBar/SearchBar';
import * as companiesApi from '../../services/api/companies.api';
import type { Company } from '../../services/api/companies.api';
import * as usersApi from '../../services/api/users.api';
import type { User } from '../../types/user.types';
import { resolveCompanyId } from '../../types/user.types';
import { fetchAllPages } from '../../utils/apiUtils';
import { normalizeString } from '../../utils/stringUtils';

import './Companies.css';

type CompanyFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const Companies: React.FC = () => {
  // ─── Estado de empresas ──────────────────────────────────────────────────
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<CompanyFilter>('ACTIVE');

  // ─── Modal editar empresa ────────────────────────────────────────────────
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // ─── Modal crear empresa ─────────────────────────────────────────────────
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);

  // ─── Modal personal de empresa ───────────────────────────────────────────
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [personnelCompany, setPersonnelCompany] = useState<Company | null>(null);
  const [personnelUsers, setPersonnelUsers] = useState<User[]>([]);
  const [personnelFilter, setPersonnelFilter] = useState<PersonnelRoleFilter>('ACTIVE');

  // ─── Modal editar usuario (desde personal) ───────────────────────────────
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // ─── Modal confirmar activar/desactivar ──────────────────────────────────
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    name: string;
    type: 'ACTIVATE' | 'DEACTIVATE';
    isUserToggle: boolean;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ─── Carga de datos ───────────────────────────────────────────────────────
  const fetchAllCompaniesPaginated = useCallback(async (): Promise<Company[]> => {
    return fetchAllPages<Company, Record<string, unknown>>(
      companiesApi.getCompanies as unknown as (
        params: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>,
      { includeInactive: true },
      'companies',
    );
  }, []);

  const fetchAllUsersPaginated = useCallback(async (): Promise<User[]> => {
    return fetchAllPages<User, Record<string, unknown>>(
      usersApi.getUsers as unknown as (
        params: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>,
      { includeInactive: true },
      'users',
    );
  }, []);

  const fetchData = useCallback(
    async (silent = false) => {
      try {
        if (silent) setIsRefreshing(true);
        else setLoading(true);
        setError(null);

        const [fetchedCompanies, fetchedUsers] = await Promise.all([
          fetchAllCompaniesPaginated(),
          fetchAllUsersPaginated(),
        ]);

        setCompanies(Array.isArray(fetchedCompanies) ? fetchedCompanies : []);
        setAllUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudieron obtener los datos.',
        );
      } finally {
        if (silent) setIsRefreshing(false);
        else setLoading(false);
      }
    },
    [fetchAllCompaniesPaginated, fetchAllUsersPaginated],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ─── Filtrado ─────────────────────────────────────────────────────────────
  const visibleCompanies = useMemo(() => {
    const term = normalizeString(searchTerm);
    return companies.filter((c) => {
      if (term) {
        const matchName = normalizeString(c.name).includes(term);
        const matchDoc = normalizeString(c.document ?? '').includes(term);
        if (!matchName && !matchDoc) return false;
      }
      if (activeFilter === 'ACTIVE') return c.active;
      if (activeFilter === 'INACTIVE') return !c.active;
      return true;
    });
  }, [companies, searchTerm, activeFilter]);

  const activeCount = companies.filter((c) => c.active).length;
  const inactiveCount = companies.filter((c) => !c.active).length;

  const statsItems: FilterStatsItem[] = [
    {
      key: 'active',
      label: 'Activas',
      count: activeCount,
      colors: {
        background: '#0d201a',
        border: 'rgba(16, 185, 129, 0.45)',
        text: '#34d399',
        hoverBorder: 'rgba(16, 185, 129, 0.75)',
        activeBorder: '#34d399',
        activeRing: 'rgba(52, 211, 153, 0.35)',
      },
      isActive: activeFilter === 'ACTIVE',
      onClick: () => setActiveFilter('ACTIVE'),
    },
    {
      key: 'inactive',
      label: 'Inactivas',
      count: inactiveCount,
      colors: {
        background: '#20130f',
        border: 'rgba(239, 68, 68, 0.45)',
        text: '#f87171',
        hoverBorder: 'rgba(239, 68, 68, 0.75)',
        activeBorder: '#f87171',
        activeRing: 'rgba(248, 113, 113, 0.35)',
      },
      isActive: activeFilter === 'INACTIVE',
      onClick: () => setActiveFilter('INACTIVE'),
    },
    {
      key: 'all',
      label: 'Total',
      count: companies.length,
      isActive: activeFilter === 'ALL',
      onClick: () => setActiveFilter('ALL'),
    },
  ];

  // ─── Acciones de fila ────────────────────────────────────────────────────
  const handleOpenCompanyModal = (company: Company) => {
    setSelectedCompany(company);
    setIsCompanyModalOpen(true);
  };

  const handleOpenPersonnelModal = useCallback(
    (company: Company) => {
      const personnel = allUsers.filter(
        (u) => resolveCompanyId(u.companyId) === company._id,
      );
      setPersonnelCompany(company);
      setPersonnelUsers(personnel);
      setPersonnelFilter('ACTIVE');
      setIsPersonnelModalOpen(true);
    },
    [allUsers],
  );

  const handleOpenToggleModal = (
    id: string,
    name: string,
    type: 'ACTIVATE' | 'DEACTIVATE',
    isUserToggle = false,
  ) => {
    setConfirmTarget({ id, name, type, isUserToggle });
    setIsConfirmOpen(true);
  };

  const handleToggleConfirm = async () => {
    if (!confirmTarget) return;
    const { id, type, isUserToggle } = confirmTarget;

    // Actualización optimista: refleja el cambio en la lista de personal al instante
    const previousPersonnelUsers = personnelUsers;
    if (isUserToggle) {
      setPersonnelUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, active: type === 'ACTIVATE' } : u)),
      );
    }

    try {
      setSubmitting(true);
      if (isUserToggle) {
        if (type === 'DEACTIVATE') await usersApi.deactivateUser(id);
        else await usersApi.activateUser(id);
      } else {
        if (type === 'DEACTIVATE') await companiesApi.deactivateCompany(id);
        else await companiesApi.activateCompany(id);
      }
      setIsConfirmOpen(false);
      setConfirmTarget(null);
      void fetchData(true);
    } catch (err) {
      // Revertir si la API falla
      if (isUserToggle) setPersonnelUsers(previousPersonnelUsers);
      alert(err instanceof Error ? err.message : 'Error al cambiar el estado');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Columnas ─────────────────────────────────────────────────────────────
  const columns: ColumnDef<Company>[] = [
    {
      key: 'company',
      header: 'EMPRESA',
      gridArea: 'company',
      cell: (c: Company) => (
        <div className="company-main-info">
          <div className="company-avatar">{c.name.charAt(0).toUpperCase()}</div>
          <div className="company-name-wrapper">
            <span className="name-text">{c.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'document',
      header: 'DOCUMENTO',
      gridArea: 'document',
      cell: (c: Company) => c.document || '---',
    },
    {
      key: 'status',
      header: 'ESTADO',
      gridArea: 'status',
      cell: (c: Company): BadgeConfig => ({
        label: c.active ? 'Activa' : 'Inactiva',
        variant: 'default',
        className: c.active
          ? 'companies-dl-badge--active'
          : 'companies-dl-badge--inactive',
      }),
    },
  ];

  const actions: RowAction<Company>[] = [
    {
      key: 'edit',
      icon: <Pencil size={16} />,
      label: 'Editar empresa',
      onClick: handleOpenCompanyModal,
      show: () => true,
    },
    {
      key: 'personnel',
      icon: <UsersRound size={16} />,
      label: 'Ver empleados',
      onClick: handleOpenPersonnelModal,
      show: () => true,
    },
    {
      key: 'deactivate',
      icon: <ToggleLeft size={16} />,
      label: 'Desactivar empresa',
      onClick: (c: Company) => handleOpenToggleModal(c._id, c.name, 'DEACTIVATE'),
      show: (c: Company) => c.active,
    },
    {
      key: 'activate',
      icon: <ToggleRight size={16} />,
      label: 'Activar empresa',
      onClick: (c: Company) => handleOpenToggleModal(c._id, c.name, 'ACTIVATE'),
      show: (c: Company) => !c.active,
    },
  ];

  const gridTemplateAreas = {
    base: `
      "company company status"
      "document document actions"
    `,
    tablet: `
      "company company company status status"
      "document document actions actions actions"
    `,
    desktop: `"company document status actions"`,
  };
  const gridTemplateColumns = 'minmax(200px, 2.5fr) minmax(130px, 1.5fr) 110px 100px';

  // ─── Columnas de personal (para PersonnelModal) ───────────────────────────
  const personnelColumns: ColumnDef<User>[] = [
    {
      key: 'user',
      header: 'USUARIO',
      gridArea: 'user',
      cell: (u: User) => (
        <div className="company-main-info">
          <div className="company-avatar">{u.name.charAt(0).toUpperCase()}</div>
          <div className="company-name-wrapper">
            <span className="name-text">{u.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'ROL',
      gridArea: 'role',
      cell: (u: User): BadgeConfig => {
        const map: Record<string, { label: string; className: string }> = {
          MECHANIC: { label: 'Mecánico', className: 'companies-dl-badge--mechanic' },
          ADMINISTRATIVE: {
            label: 'Administrativo',
            className: 'companies-dl-badge--administrative',
          },
          ADMIN: { label: 'Administrador', className: 'companies-dl-badge--active' },
        };
        return {
          label: map[u.role]?.label ?? 'Desconocido',
          variant: 'default',
          className: map[u.role]?.className ?? '',
        };
      },
    },
    {
      key: 'status',
      header: 'ESTADO',
      gridArea: 'status',
      cell: (u: User): BadgeConfig => ({
        label: u.active ? 'Activo' : 'Inactivo',
        variant: 'default',
        className: u.active
          ? 'companies-dl-badge--active'
          : 'companies-dl-badge--inactive',
      }),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <PageShell
        className="companies-page"
        header={
          <div className="page-shell-header">
            <div className="page-shell-heading">
              <h1 className="page-shell-title">Gestión de Empresas</h1>
              <div className="page-shell-subtitle-row">
                <p className="page-shell-subtitle">{visibleCompanies.length} empresas</p>
                <RefreshButton
                  onRefresh={() => fetchData(true)}
                  isRefreshing={isRefreshing}
                  isLoading={loading}
                  ariaLabel="Actualizar empresas"
                />
              </div>
            </div>
            <div className="page-shell-actions">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por nombre o documento..."
                ariaLabel="Buscar empresas"
              />
              <button
                type="button"
                className="page-shell-create-button"
                onClick={() => setIsCreateCompanyModalOpen(true)}
              >
                <Building2 size={18} />
                <span>Nueva Empresa</span>
              </button>
            </div>
          </div>
        }
        loading={
          loading && companies.length === 0 ? (
            <div className="companies-loading">Cargando empresas...</div>
          ) : error ? (
            <div className="companies-error">
              <div>
                <div className="companies-error-title">Error al cargar empresas</div>
                <div className="companies-error-message">{error}</div>
              </div>
              <button type="button" className="retry-btn" onClick={() => fetchData()}>
                Reintentar
              </button>
            </div>
          ) : undefined
        }
        stats={<FilterStats items={statsItems} />}
        filterIndicator={
          <div style={{ marginBottom: '14px' }}>
            <p className="active-filter-indicator" style={{ margin: 0 }}>
              Filtro activo:{' '}
              <strong>
                {{ ALL: 'Total', ACTIVE: 'Activas', INACTIVE: 'Inactivas' }[activeFilter]}
              </strong>
            </p>
          </div>
        }
      >
        <div className="companies-datalist">
          <DataList
            columns={columns}
            data={visibleCompanies}
            actions={actions}
            rowKey={(c) => c._id}
            variant="dark"
            alignActionsTop
            actionsAlign="right"
            onRowClick={handleOpenPersonnelModal}
            emptyMessage={
              searchTerm
                ? `No hay empresas que coincidan con "${searchTerm}"`
                : activeFilter === 'ACTIVE'
                  ? 'No hay empresas activas.'
                  : activeFilter === 'INACTIVE'
                    ? 'No hay empresas inactivas.'
                    : 'No hay empresas registradas.'
            }
            rowClassName={(c) => (!c.active ? 'dl-row--inactive' : '')}
            gridTemplateAreas={gridTemplateAreas}
            gridTemplateColumns={gridTemplateColumns}
          />
        </div>
      </PageShell>

      {/* Modal editar empresa */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => {
          setIsCompanyModalOpen(false);
          setSelectedCompany(null);
        }}
        onSaved={() => fetchData(true)}
        companyData={{
          id: selectedCompany?._id ?? '',
          name: selectedCompany?.name ?? '',
          document: selectedCompany?.document ?? '',
          phone: selectedCompany?.phone ?? '',
          address: selectedCompany?.address
            ? {
                street: selectedCompany.address.street ?? '',
                city: selectedCompany.address.city ?? '',
                zipCode: selectedCompany.address.zipCode ?? '',
                country: selectedCompany.address.country ?? '',
              }
            : undefined,
        }}
      />

      {/* Modal crear empresa */}
      <CreateCompanyModal
        isOpen={isCreateCompanyModalOpen}
        onClose={() => setIsCreateCompanyModalOpen(false)}
        onCreated={() => fetchData(true)}
        onCreate={async (data) => {
          await companiesApi.createCompany({
            name: data.companyName,
            document: data.companyDocument,
            phone: data.companyPhone,
            address: data.companyAddress,
            adminName: data.name,
            adminEmail: data.email,
            adminPassword: data.password,
          });
        }}
      />

      {/* Modal personal */}
      <PersonnelModal
        isOpen={isPersonnelModalOpen}
        onClose={() => {
          setIsPersonnelModalOpen(false);
          setPersonnelCompany(null);
          setPersonnelUsers([]);
        }}
        selectedCompany={
          // PersonnelModal espera un User; le pasamos un objeto mínimo compatible
          personnelCompany
            ? ({
                _id: personnelCompany._id,
                name: personnelCompany.name,
                email: '',
                role: 'ADMIN',
                companyId: personnelCompany._id,
                active: personnelCompany.active,
              } as User)
            : null
        }
        personnelUsers={personnelUsers}
        activeFilter={personnelFilter}
        onFilterChange={setPersonnelFilter}
        columns={personnelColumns}
        onEditUser={(u) => {
          setEditingUser(u);
          setIsPersonnelModalOpen(false);
          setIsUserModalOpen(true);
        }}
        onToggleUser={(u, type) => handleOpenToggleModal(u._id, u.name, type, true)}
      />

      {/* Modal editar usuario (abierto desde personal) */}
      <UserModal
        isOpen={isUserModalOpen}
        editingUser={editingUser}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingUser(null);
        }}
        onSaved={() => fetchData(true)}
        onCreate={async (data) => {
          await usersApi.createUser(data);
        }}
        onUpdate={async (id, data) => {
          await usersApi.updateUser(id, data);
        }}
      />

      {/* Modal confirmar activar/desactivar */}
      <ConfirmModal
        isOpen={isConfirmOpen && !!confirmTarget}
        title={
          confirmTarget?.type === 'DEACTIVATE'
            ? confirmTarget.isUserToggle
              ? 'Desactivar Usuario'
              : 'Desactivar Empresa'
            : confirmTarget?.isUserToggle
              ? 'Activar Usuario'
              : 'Activar Empresa'
        }
        description={
          confirmTarget
            ? `¿Estás seguro de que deseas ${
                confirmTarget.type === 'DEACTIVATE' ? 'desactivar' : 'activar'
              } "${confirmTarget.name}"?`
            : ''
        }
        confirmText={
          confirmTarget?.type === 'DEACTIVATE'
            ? submitting
              ? 'Desactivando...'
              : 'Sí, desactivar'
            : submitting
              ? 'Reactivando...'
              : 'Sí, reactivar'
        }
        cancelText="Cancelar"
        onConfirm={handleToggleConfirm}
        onCancel={() => {
          setIsConfirmOpen(false);
          setConfirmTarget(null);
        }}
        loading={submitting}
        confirmClassName={confirmTarget?.type === 'DEACTIVATE' ? 'deactivate' : 'success'}
      />
    </>
  );
};

export default Companies;
