/* import {
  UserPlus,
  Mail,
  Edit2,
  BarChart3,
  UserCheck,
  UserX,
  Pencil,
  UsersRound,
  ToggleRight,
  ToggleLeft,
} from 'lucide-react';
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
import MechanicMetricsModal from '../../components/modals/users/MechanicMetricsModal';
import PersonnelModal, {
  type PersonnelRoleFilter,
} from '../../components/modals/users/PersonnelModal';
import UserModal from '../../components/modals/users/UserModal';
import WorkOrderModal from '../../components/modals/workorders/WorkOrderModal';
import PageShell from '../../components/PageShell/PageShell';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import SearchBar from '../../components/SearchBar/SearchBar';
import { useUserData } from '../../context/UserContext/UserContext';
import * as companiesApi from '../../services/api/companies.api';
import * as usersApi from '../../services/api/users.api';
import * as workOrderApi from '../../services/api/workOrders.api';
import type { User } from '../../types/user.types';
import { resolveCompanyId } from '../../types/user.types';
import type { WorkOrder, WorkOrderStatus } from '../../types/workOrder.types';
import { fetchAllPages } from '../../utils/apiUtils';
import { normalizeString } from '../../utils/stringUtils';

import './Users.css';

type UserRoleFilter =
  | 'ALL'
  | 'MECHANIC'
  | 'ADMINISTRATIVE'
  | 'ADMIN'
  | 'ACTIVE'
  | 'INACTIVE';

const Users: React.FC = () => {
  const { user } = useUserData();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const isAdministrativePanel = user?.role === 'ADMINISTRATIVE';
  const canEditUsers = isAdmin || isSuperAdmin;

  const [users, setUsers] = useState<User[]>([]);
  const [activeRoleFilter, setActiveRoleFilter] = useState<UserRoleFilter>(() =>
    user?.role === 'SUPER_ADMIN' ? 'ACTIVE' : 'ALL',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mechanicMetrics, setMechanicMetrics] = useState<
    Record<
      string,
      {
        completedCount: number;
        deliveredCount: number;
        deliveredTotal: number;
        assignedCount: number;
      }
    >
  >({});
  const [userTotals, setUserTotals] = useState<
    Record<string, { workOrdersCount: number; billingTotal: number }>
  >({});
  const [recentWorkOrders, setRecentWorkOrders] = useState<WorkOrder[]>([]);
  const [_loadingRecent, setLoadingRecent] = useState(false);
  const [allUsersRaw, setAllUsersRaw] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [metricsUser, setMetricsUser] = useState<User | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [_metricsError, setMetricsError] = useState<string | null>(null);
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'ACTIVATE' | 'DEACTIVATE' | null>(null);
  const [userToToggle, setUserToToggle] = useState<{
    id: string;
    name: string;
    companyId?: string;
    isUserToggle?: boolean;
  } | null>(null);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<User | null>(null);
  const [personnelUsers, setPersonnelUsers] = useState<User[]>([]);
  const [modalActiveFilter, setModalActiveFilter] =
    useState<PersonnelRoleFilter>('ACTIVE');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [selectedCompanyData, setSelectedCompanyData] = useState<{
    _id: string;
    name: string;
    document?: string;
    phone?: string;
    address?: { street: string; city: string; zipCode: string; country: string };
  } | null>(null);

  const fetchAllWorkOrders = useCallback(
    async (mechanicId?: string, status?: WorkOrderStatus): Promise<WorkOrder[]> => {
      return fetchAllPages<WorkOrder, Record<string, unknown>>(
        workOrderApi.getWorkOrders as unknown as (
          params: Record<string, unknown>,
        ) => Promise<Record<string, unknown>>,
        {
          ...(mechanicId ? { mechanic: mechanicId } : {}),
          ...(status ? { status } : {}),
        },
        'workOrders',
      );
    },
    [],
  );

  const isAssignedToUser = useCallback(
    (workOrder: WorkOrder, userId: string): boolean => {
      const mechanic = workOrder.mechanic;
      if (!mechanic) return false;
      if (typeof mechanic === 'string') return mechanic === userId;
      return mechanic._id === userId;
    },
    [],
  );

  const fetchAllMechanicWorkOrders = useCallback(
    async (mechanicId: string, status?: WorkOrderStatus): Promise<WorkOrder[]> => {
      try {
        return await fetchAllWorkOrders(mechanicId, status);
      } catch (err) {
        if (status) throw err;
        console.warn(
          'Fallo al filtrar por mechanic en backend, fallback en frontend:',
          err,
        );
        const allOrders = await fetchAllWorkOrders();
        return allOrders.filter(
          (wo) => isAssignedToUser(wo, mechanicId) && (!status || wo.status === status),
        );
      }
    },
    [fetchAllWorkOrders, isAssignedToUser],
  );

  const fetchAllUsersPaginated = useCallback(async (): Promise<User[]> => {
    return fetchAllPages<User, Record<string, unknown>>(
      usersApi.getUsers as unknown as (
        params: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>,
      { includeInactive: true },
      'users',
    );
  }, []);

  const fetchAllMechanicsPaginated = useCallback(async (): Promise<User[]> => {
    return fetchAllPages<User, Record<string, unknown>>(
      usersApi.getMechanics as unknown as (
        params: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>,
      {},
      'mechanics',
    );
  }, []);

  const calculateUserTotals = useCallback(
    async (targetUsers: User[]) => {
      const totalsByUser: Record<
        string,
        { workOrdersCount: number; billingTotal: number }
      > = {};
      targetUsers.forEach((u) => {
        totalsByUser[u._id] = { workOrdersCount: 0, billingTotal: 0 };
      });

      const mechanics = targetUsers.filter((u) => u.role === 'MECHANIC');
      await Promise.all(
        mechanics.map(async (mechanic) => {
          const mechanicOrders = await fetchAllMechanicWorkOrders(mechanic._id);
          const deliveredOrders = await fetchAllMechanicWorkOrders(
            mechanic._id,
            'DELIVERED',
          );
          totalsByUser[mechanic._id].workOrdersCount = mechanicOrders.filter(
            (o) => o.status !== 'CANCELLED',
          ).length;
          totalsByUser[mechanic._id].billingTotal = deliveredOrders.reduce(
            (sum, o) => sum + Number(o.total || 0),
            0,
          );
        }),
      );
      setUserTotals(totalsByUser);
    },
    [fetchAllMechanicWorkOrders],
  );

  const fetchUsers = useCallback(
    async (silent = false): Promise<void> => {
      try {
        if (silent) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        if (isAdministrativePanel) {
          const mechanics = await fetchAllMechanicsPaginated();
          if (Array.isArray(mechanics)) {
            setUsers(mechanics);
            await calculateUserTotals(mechanics);
          } else {
            setUsers([]);
            setUserTotals({});
          }
        } else if (isSuperAdmin) {
          const allUsers = await fetchAllUsersPaginated();
          if (Array.isArray(allUsers)) {
            const adminUsers = allUsers.filter((u) => u.role === 'ADMIN');
            const uniqueCompanies = new Map<string, User>();
            adminUsers.forEach((u) => {
              const key = resolveCompanyId(u.companyId) ?? u._id;
              if (!uniqueCompanies.has(key) || u.active) uniqueCompanies.set(key, u);
            });
            setAllUsersRaw(allUsers);
            setUsers(Array.from(uniqueCompanies.values()));
            setUserTotals({});
          } else {
            setUsers([]);
            setUserTotals({});
          }
        } else {
          const allUsers = await fetchAllUsersPaginated();
          if (Array.isArray(allUsers)) {
            const filtered = allUsers.filter(
              (u) => u.role === 'MECHANIC' || u.role === 'ADMINISTRATIVE',
            );
            setUsers(filtered);
            await calculateUserTotals(filtered);
          } else {
            setUsers([]);
            setUserTotals({});
          }
        }
      } catch (err: unknown) {
        console.error('Error al obtener datos:', err);
        setError(
          err instanceof Error ? err.message : 'No se pudieron obtener los datos.',
        );
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [
      isAdministrativePanel,
      isSuperAdmin,
      calculateUserTotals,
      fetchAllMechanicsPaginated,
      fetchAllUsersPaginated,
    ],
  );

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleOpenModal = (targetUser?: User) => {
    if (!canEditUsers) return;
    setEditingUser(targetUser ?? null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setRecentWorkOrders([]);
  };

  const handleOpenMetricsModal = async (targetUser: User) => {
    setMetricsUser(targetUser);
    setIsMetricsModalOpen(true);
    if (targetUser.role !== 'MECHANIC') return;

    setIsMetricsLoading(true);
    setMetricsError(null);
    setLoadingRecent(true);

    try {
      const mechanicOrders = await fetchAllMechanicWorkOrders(targetUser._id);
      const deliveredOrders = await fetchAllMechanicWorkOrders(
        targetUser._id,
        'DELIVERED',
      );

      setRecentWorkOrders(
        mechanicOrders
          .sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 4),
      );
      // Calcular albaranes asignados (no cancelados)
      const assignedCount = mechanicOrders.filter(
        (wo) => wo.status !== 'CANCELLED',
      ).length;
      setMechanicMetrics((prev) => ({
        ...prev,
        [targetUser._id]: {
          completedCount: deliveredOrders.length,
          deliveredCount: deliveredOrders.length,
          deliveredTotal: deliveredOrders.reduce(
            (sum, wo) => sum + Number(wo.total || 0),
            0,
          ),
          assignedCount,
        },
      }));
    } catch (err) {
      console.error('No se pudieron cargar las métricas:', err);
      setMetricsError('No se pudieron cargar las métricas para este mecánico.');
      setMechanicMetrics((prev) => ({
        ...prev,
        [targetUser._id]: {
          completedCount: 0,
          deliveredCount: 0,
          deliveredTotal: 0,
          assignedCount: 0,
        },
      }));
      setRecentWorkOrders([]);
    } finally {
      setIsMetricsLoading(false);
      setLoadingRecent(false);
    }
  };

  const handleCloseMetricsModal = () => {
    setIsMetricsModalOpen(false);
    setMetricsUser(null);
    setMetricsError(null);
    setRecentWorkOrders([]);
  };

  const handleOpenWorkOrderModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsWorkOrderModalOpen(true);
  };

  const handleCloseWorkOrderModal = () => {
    setIsWorkOrderModalOpen(false);
    setSelectedOrderId(null);
  };

  const handleOpenCompanyModal = (targetUser: User) => {
    if (typeof targetUser.companyId === 'object' && targetUser.companyId !== null) {
      setSelectedCompanyData(targetUser.companyId);
      setIsCompanyModalOpen(true);
    }
  };

  const handleOpenToggleModal = (
    id: string,
    name: string,
    type: 'ACTIVATE' | 'DEACTIVATE',
    companyId?: string,
    isUserToggle = false,
  ) => {
    setUserToToggle({ id, name, companyId, isUserToggle });
    setModalType(type);
    setIsToggleModalOpen(true);
  };

  const handleCloseToggleModal = () => {
    setIsToggleModalOpen(false);
    setUserToToggle(null);
    setModalType(null);
  };

  const handleToggleConfirm = async () => {
    if (!userToToggle || !modalType) return;
    try {
      setSubmitting(true);
      const actOnCompany =
        isSuperAdmin && !!userToToggle.companyId && !userToToggle.isUserToggle;
      if (modalType === 'DEACTIVATE') {
        if (actOnCompany) {
          await companiesApi.deactivateCompany(userToToggle.companyId!);
        } else {
          await usersApi.deactivateUser(userToToggle.id);
        }
      } else {
        if (actOnCompany) {
          await companiesApi.activateCompany(userToToggle.companyId!);
        } else {
          await usersApi.activateUser(userToToggle.id);
        }
      }
      handleCloseToggleModal();
      fetchUsers();
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : 'Error al cambiar el estado del usuario',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPersonnelModal = useCallback(
    (targetUser: User) => {
      if (!isSuperAdmin) return;
      const company =
        typeof targetUser.companyId === 'object' ? targetUser.companyId : null;
      if (!company) return;

      const companyId = company._id;
      const personnel = allUsersRaw.filter(
        (u) => resolveCompanyId(u.companyId) === companyId,
      );

      setSelectedCompany(targetUser);
      setPersonnelUsers(personnel);
      setIsPersonnelModalOpen(true);
    },
    [allUsersRaw, isSuperAdmin],
  );

  const handleClosePersonnelModal = () => {
    setIsPersonnelModalOpen(false);
    setSelectedCompany(null);
    setPersonnelUsers([]);
    setModalActiveFilter('ACTIVE');
  };

  const visibleUsers = useMemo(() => {
    return users.filter((u) => {
      const term = normalizeString(searchTerm);
      const matchesSearch =
        !term ||
        normalizeString(u.name).includes(term) ||
        normalizeString(u.email).includes(term);
      const isActive = canEditUsers ? true : u.active;
      return matchesSearch && isActive;
    });
  }, [users, searchTerm, canEditUsers]);

  const roleFilteredUsers = useMemo(() => {
    switch (activeRoleFilter) {
      case 'ALL':
        if (!isSuperAdmin) {
          return visibleUsers.filter(
            (u) => u.active && (u.role === 'MECHANIC' || u.role === 'ADMINISTRATIVE'),
          );
        }
        return visibleUsers;
      case 'ACTIVE':
        if (isSuperAdmin) {
          return visibleUsers.filter((u) =>
            typeof u.companyId === 'object' ? u.companyId.active === true : u.active,
          );
        }
        return visibleUsers.filter((u) => u.active);
      case 'INACTIVE':
        if (isSuperAdmin) {
          return visibleUsers.filter((u) =>
            typeof u.companyId === 'object' ? u.companyId.active === false : !u.active,
          );
        }
        return visibleUsers.filter(
          (u) => !u.active && (u.role === 'MECHANIC' || u.role === 'ADMINISTRATIVE'),
        );
      case 'MECHANIC':
        return visibleUsers.filter((u) => u.role === 'MECHANIC' && u.active);
      case 'ADMINISTRATIVE':
        return visibleUsers.filter((u) => u.role === 'ADMINISTRATIVE' && u.active);
      default:
        return visibleUsers.filter((u) => u.role === activeRoleFilter);
    }
  }, [visibleUsers, activeRoleFilter, isSuperAdmin]);

  const totalCount = visibleUsers.length;
  const activeCount = visibleUsers.filter((u) => u.active).length;
  const inactiveCount = visibleUsers.filter((u) => !u.active).length;
  const mechanicCount = users.filter((u) => u.role === 'MECHANIC' && u.active).length;
  const administrativeCount = users.filter(
    (u) => u.role === 'ADMINISTRATIVE' && u.active,
  ).length;

  const filterLabelByType: Record<UserRoleFilter, string> = {
    ALL: 'Total',
    MECHANIC: 'Mecánicos',
    ADMINISTRATIVE: 'Administrativos',
    ADMIN: 'Administradores',
    ACTIVE: 'Activas',
    INACTIVE: 'Inactivas',
  };

  const emptyStateByFilter: Record<UserRoleFilter, string> = {
    ALL: 'No hay registros.',
    MECHANIC: 'No hay mecánicos activos.',
    ADMINISTRATIVE: 'No hay administrativos activos.',
    ADMIN: 'No hay administradores activos.',
    ACTIVE: 'No hay empresas activas.',
    INACTIVE: 'No hay empresas inactivas.',
  };

  const statsItems: FilterStatsItem[] = isSuperAdmin
    ? [
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
          isActive: activeRoleFilter === 'ACTIVE',
          onClick: () => setActiveRoleFilter('ACTIVE'),
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
          isActive: activeRoleFilter === 'INACTIVE',
          onClick: () => setActiveRoleFilter('INACTIVE'),
        },
        {
          key: 'all',
          label: 'Total',
          count: totalCount,
          isActive: activeRoleFilter === 'ALL',
          onClick: () => setActiveRoleFilter('ALL'),
        },
      ]
    : [
        {
          key: 'mechanic',
          label: 'Mecánicos',
          count: mechanicCount,
          colors: {
            background: '#0d1a2a',
            border: 'rgba(96, 165, 250, 0.45)',
            text: '#60a5fa',
            hoverBorder: 'rgba(96, 165, 250, 0.75)',
            activeBorder: '#60a5fa',
            activeRing: 'rgba(96, 165, 250, 0.35)',
          },
          isActive: activeRoleFilter === 'MECHANIC',
          onClick: () => setActiveRoleFilter('MECHANIC'),
        },
        {
          key: 'administrative',
          label: 'Administrativos',
          count: administrativeCount,
          colors: {
            background: '#2a230f',
            border: 'rgba(250, 204, 21, 0.45)',
            text: '#facc15',
            hoverBorder: 'rgba(250, 204, 21, 0.75)',
            activeBorder: '#facc15',
            activeRing: 'rgba(250, 204, 21, 0.35)',
          },
          isActive: activeRoleFilter === 'ADMINISTRATIVE',
          onClick: () => setActiveRoleFilter('ADMINISTRATIVE'),
        },
        {
          key: 'inactive',
          label: 'Inactivos',
          count: visibleUsers.filter(
            (u) => !u.active && (u.role === 'MECHANIC' || u.role === 'ADMINISTRATIVE'),
          ).length,
          colors: {
            background: '#20130f',
            border: 'rgba(239, 68, 68, 0.45)',
            text: '#f87171',
            hoverBorder: 'rgba(239, 68, 68, 0.75)',
            activeBorder: '#f87171',
            activeRing: 'rgba(248, 113, 113, 0.35)',
          },
          isActive: activeRoleFilter === 'INACTIVE',
          onClick: () => setActiveRoleFilter('INACTIVE'),
        },
        {
          key: 'all',
          label: 'Total Activos',
          // Siempre mostrar el total de usuarios activos (mecánicos + administrativos), no el filtrado
          count: users.filter(
            (u) => u.active && (u.role === 'MECHANIC' || u.role === 'ADMINISTRATIVE'),
          ).length,
          isActive: activeRoleFilter === 'ALL',
          onClick: () => setActiveRoleFilter('ALL'),
        },
      ];

  const userActions: RowAction<User>[] = [
    {
      key: 'metrics',
      icon: <BarChart3 size={16} />,
      label: 'Ver métricas',
      onClick: (u: User) => {
        void handleOpenMetricsModal(u);
      },
      show: (u: User) => !isSuperAdmin && u.role === 'MECHANIC' && u.active,
    },
    {
      key: 'company',
      icon: <Pencil size={16} />,
      label: 'Editar empresa',
      onClick: (u: User) => handleOpenCompanyModal(u),
      show: (u: User) => isSuperAdmin && !!u.companyId,
    },
    {
      key: 'personnel',
      icon: <UsersRound size={16} />,
      label: 'Ver empleados',
      onClick: (u: User) => handleOpenPersonnelModal(u),
      show: (u: User) => isSuperAdmin && !!u.companyId,
    },
    ...(canEditUsers && !isSuperAdmin
      ? [
          {
            key: 'edit',
            icon: <Edit2 size={16} />,
            label: 'Editar',
            onClick: (u: User) => handleOpenModal(u),
            show: (u: User) => u.active,
          },
        ]
      : []),
    {
      key: 'deactivate',
      icon: isSuperAdmin ? <ToggleLeft size={16} /> : <UserX size={16} />,
      label: isSuperAdmin ? 'Desactivar empresa' : 'Desactivar',
      onClick: (u: User) =>
        handleOpenToggleModal(
          u._id,
          u.name,
          'DEACTIVATE',
          resolveCompanyId(u.companyId),
        ),
      show: (u: User) => canEditUsers && u.active,
    },
    {
      key: 'activate',
      icon: isSuperAdmin ? <ToggleRight size={16} /> : <UserCheck size={16} />,
      label: isSuperAdmin ? 'Activar empresa' : 'Activar',
      onClick: (u: User) =>
        handleOpenToggleModal(
          u._id,
          u.name,
          'ACTIVATE',
          resolveCompanyId(u.companyId),
        ),
      show: (u: User) => canEditUsers && !u.active,
    },
  ];

  const userColumns: ColumnDef<User>[] = [
    ...(isSuperAdmin
      ? [
          {
            key: 'company',
            header: 'EMPRESA',
            gridArea: 'company',
            cell: (u: User) => {
              if (typeof u.companyId === 'object' && u.companyId !== null) {
                return (
                  <div className="user-main-info">
                    <div className="user-avatar">
                      {u.companyId.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-name-wrapper">
                      <span className="name-text">{u.companyId.name}</span>
                    </div>
                  </div>
                );
              }
              return '---';
            },
          },
          {
            key: 'document',
            header: 'DOCUMENTO',
            gridArea: 'document',
            cell: (u: User) =>
              typeof u.companyId === 'object' && u.companyId !== null
                ? u.companyId.document || '---'
                : '---',
          },
          {
            key: 'status',
            header: 'ESTADO',
            gridArea: 'status',
            cell: (u: User): BadgeConfig => ({
              label: u.active ? 'Activa' : 'Inactiva',
              variant: 'default',
              className: u.active ? 'users-dl-badge--active' : 'users-dl-badge--inactive',
            }),
          },
        ]
      : [
          {
            key: 'user',
            header: 'USUARIO',
            gridArea: 'user',
            cell: (u: User) => (
              <div className="user-main-info">
                <div className="user-avatar">{u.name.charAt(0).toUpperCase()}</div>
                <div className="user-name-wrapper">
                  <span className="name-text">{u.name}</span>
                </div>
              </div>
            ),
          },
          {
            key: 'contact',
            header: 'CONTACTO',
            gridArea: 'contact',
            cell: (u: User) => (
              <div className="contact-item">
                <Mail size={14} />
                <span>{u.email}</span>
              </div>
            ),
          },
        ]),
    ...(!isAdministrativePanel && !isSuperAdmin
      ? [
          {
            key: 'role',
            header: 'ROL',
            gridArea: 'role',
            cell: (u: User): BadgeConfig => {
              const map: Record<string, { label: string; className: string }> = {
                MECHANIC: { label: 'Mecánico', className: 'users-dl-badge--mechanic' },
                ADMINISTRATIVE: {
                  label: 'Administrativo',
                  className: 'users-dl-badge--administrative',
                },
                ADMIN: { label: 'Administrador', className: 'users-dl-badge--active' },
              };
              return {
                label: map[u.role]?.label ?? 'Desconocido',
                variant: 'default',
                className: map[u.role]?.className ?? '',
              };
            },
          },
        ]
      : []),
    ...(isAdministrativePanel
      ? [
          {
            key: 'workOrders',
            header: 'ALBARANES',
            gridArea: 'workOrders',
            cell: (u: User) => userTotals[u._id]?.workOrdersCount ?? 0,
          },
          {
            key: 'billing',
            header: 'IMPORTE',
            gridArea: 'billing',
            cell: (u: User) =>
              (userTotals[u._id]?.billingTotal ?? 0).toLocaleString('es-ES', {
                style: 'currency',
                currency: 'EUR',
              }),
          },
        ]
      : []),
  ];

  const personnelColumns: ColumnDef<User>[] = [
    {
      key: 'user',
      header: 'USUARIO',
      gridArea: 'user',
      cell: (u: User) => (
        <div className="user-main-info">
          <div className="user-avatar">{u.name.charAt(0).toUpperCase()}</div>
          <div className="user-name-wrapper">
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
          MECHANIC: { label: 'Mecánico', className: 'users-dl-badge--mechanic' },
          ADMINISTRATIVE: {
            label: 'Administrativo',
            className: 'users-dl-badge--administrative',
          },
          ADMIN: { label: 'Administrador', className: 'users-dl-badge--active' },
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
        className: u.active ? 'users-dl-badge--active' : 'users-dl-badge--inactive',
      }),
    },
  ];

  const usersGridTemplateAreas = isSuperAdmin
    ? {
        base: `
          "company company status"
          "document document actions"
        `,
        tablet: `
          "company company company status status"
          "document document actions actions actions"
        `,
        desktop: `"company document status actions"`,
      }
    : isAdministrativePanel
      ? {
          base: `
            "user user user"
            "contact contact contact"
            "workOrders billing actions"
          `,
          tablet: `
            "user user contact contact contact contact"
            "workOrders workOrders billing actions actions actions"
          `,
          desktop: `"user contact workOrders billing actions"`,
        }
      : {
          base: `
            "user user user"
            "contact contact contact"
            "role role actions"
          `,
          tablet: `
            "user user user role role"
            "contact contact contact actions actions"
          `,
          desktop: `"user contact role actions"`,
        };

  const usersGridTemplateColumns = isSuperAdmin
    ? 'minmax(200px, 2.5fr) minmax(130px, 1.5fr) 110px 100px'
    : isAdministrativePanel
      ? 'minmax(200px, 2.2fr) minmax(180px, 1.9fr) 120px 130px 100px'
      : 'minmax(200px, 2.4fr) minmax(180px, 2fr) 130px 100px';

  const handleRowClick = (targetUser: User) => {
    if (!targetUser.active) return;
    if (isSuperAdmin) {
      handleOpenCompanyModal(targetUser);
      return;
    }
    if (canEditUsers) {
      handleOpenModal(targetUser);
      return;
    }
    if (targetUser.role === 'MECHANIC') void handleOpenMetricsModal(targetUser);
  };

  return (
    <>
      <PageShell
        className="users-page users-page--management"
        header={
          <div className="page-shell-header">
            <div className="page-shell-heading">
              <h1 className="page-shell-title">
                {isSuperAdmin
                  ? 'Gestión de Empresas'
                  : isAdministrativePanel
                    ? 'Actividad de Mecánicos'
                    : 'Gestión de Usuarios'}
              </h1>
              <div className="page-shell-subtitle-row">
                <p className="page-shell-subtitle">{totalCount} registros totales</p>
                <RefreshButton
                  onRefresh={() => fetchUsers(true)}
                  isRefreshing={isRefreshing}
                  isLoading={loading}
                  ariaLabel="Actualizar usuarios"
                />
              </div>
            </div>
            <div className="page-shell-actions">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por nombre o email..."
                ariaLabel={isAdministrativePanel ? 'Buscar mecánicos' : 'Buscar usuarios'}
              />
              {canEditUsers && (
                <button
                  type="button"
                  className="page-shell-create-button"
                  onClick={
                    canEditUsers
                      ? () => {
                          if (isSuperAdmin) {
                            setIsCreateCompanyModalOpen(true);
                          } else {
                            handleOpenModal();
                          }
                        }
                      : undefined
                  }
                >
                  <UserPlus size={18} />
                  <span>
                    {isSuperAdmin
                      ? 'Nueva Empresa'
                      : isAdministrativePanel
                        ? 'Nuevo Mecánico'
                        : 'Nuevo Usuario'}
                  </span>
                </button>
              )}
            </div>
          </div>
        }
        loading={
          loading && users.length === 0 ? (
            <div className="users-loading">Cargando equipo...</div>
          ) : error ? (
            <div className="users-error">
              <div>
                <div className="users-error-title">Error al cargar usuarios</div>
                <div className="users-error-message">{error}</div>
              </div>
              <button type="button" className="retry-btn" onClick={() => fetchUsers()}>
                Reintentar
              </button>
            </div>
          ) : undefined
        }
        stats={
          isAdministrativePanel ? undefined : (
            <FilterStats
              items={statsItems}
              tabletColumns={statsItems.length === 4 ? 2 : undefined}
            />
          )
        }
        filterIndicator={
          isAdministrativePanel ? undefined : (
            <div style={{ marginBottom: '14px' }}>
              <p className="active-filter-indicator" style={{ margin: 0 }}>
                Filtro activo: <strong>{filterLabelByType[activeRoleFilter]}</strong>
              </p>
            </div>
          )
        }
      >
        <div className="users-datalist">
          <DataList
            columns={userColumns}
            data={roleFilteredUsers}
            actions={userActions}
            rowKey={(u) => u._id}
            variant="dark"
            alignActionsTop
            actionsAlign="right"
            onRowClick={handleRowClick}
            emptyMessage={
              searchTerm
                ? `No hay usuarios que coincidan con "${searchTerm}"`
                : emptyStateByFilter[activeRoleFilter]
            }
            rowClassName={(u) => (!u.active ? 'dl-row--inactive' : '')}
            gridTemplateAreas={usersGridTemplateAreas}
            gridTemplateColumns={usersGridTemplateColumns}
          />
        </div>
      </PageShell>

      <PersonnelModal
        isOpen={isPersonnelModalOpen}
        onClose={handleClosePersonnelModal}
        selectedCompany={selectedCompany}
        personnelUsers={personnelUsers}
        activeFilter={modalActiveFilter}
        onFilterChange={setModalActiveFilter}
        columns={personnelColumns}
        onEditUser={(u) => handleOpenModal(u)}
        onToggleUser={(u, type) =>
          handleOpenToggleModal(
            u._id,
            u.name,
            type,
            resolveCompanyId(u.companyId),
            true, // isUserToggle: desactivar el usuario, no la empresa
          )
        }
      />

      <UserModal
        isOpen={isModalOpen}
        editingUser={editingUser}
        onClose={handleCloseModal}
        onSaved={() => fetchUsers()}
        onCreate={async (data) => {
          await usersApi.createUser(data);
        }}
        onUpdate={async (id, data) => {
          await usersApi.updateUser(id, data);
        }}
      />

      <ConfirmModal
        isOpen={isToggleModalOpen && !!userToToggle && !!modalType}
        title={
          modalType === 'DEACTIVATE'
            ? isSuperAdmin && !userToToggle?.isUserToggle
              ? 'Desactivar Empresa'
              : 'Desactivar Usuario'
            : isSuperAdmin && !userToToggle?.isUserToggle
              ? 'Activar Empresa'
              : 'Activar Usuario'
        }
        description={
          userToToggle && modalType
            ? (() => {
                const isCompanyAction = isSuperAdmin && !userToToggle.isUserToggle;
                const entityLabel = isCompanyAction ? 'la empresa' : 'al usuario';
                const deactivateMsg = isCompanyAction
                  ? 'Se desactivará el acceso de esta empresa y todos sus usuarios.'
                  : 'Se desactivará el acceso de este usuario.';
                const activateMsg = isCompanyAction
                  ? 'Se reactivará el acceso de esta empresa y todos sus usuarios.'
                  : 'Se reactivará el acceso de este usuario.';
                return (
                  `¿Estás seguro de que deseas ${modalType === 'DEACTIVATE' ? 'desactivar' : 'activar'} ${entityLabel} "${userToToggle.name}"?\n` +
                  (modalType === 'DEACTIVATE' ? deactivateMsg : activateMsg)
                );
              })()
            : ''
        }
        confirmText={
          modalType === 'DEACTIVATE'
            ? submitting
              ? 'Desactivando...'
              : 'Sí, desactivar'
            : submitting
              ? 'Reactivando...'
              : 'Sí, reactivar'
        }
        cancelText="Cancelar"
        onConfirm={handleToggleConfirm}
        onCancel={handleCloseToggleModal}
        loading={submitting}
        icon={modalType === 'DEACTIVATE' ? <UserX size={24} /> : <UserCheck size={24} />}
        iconClassName={modalType === 'DEACTIVATE' ? 'deactivate' : 'success'}
        confirmClassName={modalType === 'DEACTIVATE' ? 'deactivate' : 'success'}
      />

      <MechanicMetricsModal
        isOpen={isMetricsModalOpen}
        onClose={handleCloseMetricsModal}
        user={metricsUser}
        metrics={metricsUser ? mechanicMetrics[metricsUser._id] : null}
        loading={isMetricsLoading}
        recentWorkOrders={recentWorkOrders}
        onWorkOrderClick={handleOpenWorkOrderModal}
      />

      <WorkOrderModal
        isOpen={isWorkOrderModalOpen}
        onClose={handleCloseWorkOrderModal}
        orderId={selectedOrderId}
        onUpdate={fetchUsers}
      />

      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => {
          setIsCompanyModalOpen(false);
          setSelectedCompanyData(null);
        }}
        onSaved={() => fetchUsers()}
        companyData={{
          id: selectedCompanyData?._id ?? '',
          name: selectedCompanyData?.name ?? '',
          document: selectedCompanyData?.document ?? '',
          phone: selectedCompanyData?.phone ?? '',
          address: selectedCompanyData?.address,
        }}
      />

      <CreateCompanyModal
        isOpen={isCreateCompanyModalOpen}
        onClose={() => setIsCreateCompanyModalOpen(false)}
        onCreated={() => fetchUsers()}
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
    </>
  );
};

export default Users;
 */

import { UserPlus, Mail, Edit2, BarChart3, UserCheck, UserX } from 'lucide-react';
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
import ConfirmModal from '../../components/modals/ConfirmModal';
import MechanicMetricsModal from '../../components/modals/users/MechanicMetricsModal';
import UserModal from '../../components/modals/users/UserModal';
import WorkOrderModal from '../../components/modals/workorders/WorkOrderModal';
import PageShell from '../../components/PageShell/PageShell';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import SearchBar from '../../components/SearchBar/SearchBar';
import { useUserData } from '../../context/UserContext/UserContext';
import * as usersApi from '../../services/api/users.api';
import * as workOrderApi from '../../services/api/workOrders.api';
import type { User } from '../../types/user.types';
import type { WorkOrder, WorkOrderStatus } from '../../types/workOrder.types';
import { fetchAllPages } from '../../utils/apiUtils';
import { normalizeString } from '../../utils/stringUtils';

import './Users.css';

// SUPER_ADMIN nunca llega aquí; tiene su propia vista en /views/Companies
type UserRoleFilter = 'ALL' | 'MECHANIC' | 'ADMINISTRATIVE' | 'ACTIVE' | 'INACTIVE';

const Users: React.FC = () => {
  const { user } = useUserData();
  const isAdmin = user?.role === 'ADMIN';
  const isAdministrativePanel = user?.role === 'ADMINISTRATIVE';
  const canEditUsers = isAdmin;

  const [users, setUsers] = useState<User[]>([]);
  const [activeRoleFilter, setActiveRoleFilter] = useState<UserRoleFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mechanicMetrics, setMechanicMetrics] = useState<
    Record<
      string,
      {
        completedCount: number;
        deliveredCount: number;
        deliveredTotal: number;
        assignedCount: number;
      }
    >
  >({});
  const [userTotals, setUserTotals] = useState<
    Record<string, { workOrdersCount: number; billingTotal: number }>
  >({});
  const [recentWorkOrders, setRecentWorkOrders] = useState<WorkOrder[]>([]);
  const [_loadingRecent, setLoadingRecent] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [metricsUser, setMetricsUser] = useState<User | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [_metricsError, setMetricsError] = useState<string | null>(null);

  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'ACTIVATE' | 'DEACTIVATE' | null>(null);
  const [userToToggle, setUserToToggle] = useState<{ id: string; name: string } | null>(
    null,
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);

  // ─── Helpers para work orders ─────────────────────────────────────────────
  const fetchAllWorkOrders = useCallback(
    async (mechanicId?: string, status?: WorkOrderStatus): Promise<WorkOrder[]> =>
      fetchAllPages<WorkOrder, Record<string, unknown>>(
        workOrderApi.getWorkOrders as unknown as (
          p: Record<string, unknown>,
        ) => Promise<Record<string, unknown>>,
        {
          ...(mechanicId ? { mechanic: mechanicId } : {}),
          ...(status ? { status } : {}),
        },
        'workOrders',
      ),
    [],
  );

  const isAssignedToUser = useCallback((wo: WorkOrder, userId: string): boolean => {
    const m = wo.mechanic;
    if (!m) return false;
    if (typeof m === 'string') return m === userId;
    return (m as { _id: string })._id === userId;
  }, []);

  const fetchAllMechanicWorkOrders = useCallback(
    async (mechanicId: string, status?: WorkOrderStatus): Promise<WorkOrder[]> => {
      try {
        return await fetchAllWorkOrders(mechanicId, status);
      } catch (err) {
        if (status) throw err;
        const all = await fetchAllWorkOrders();
        return all.filter((wo) => isAssignedToUser(wo, mechanicId));
      }
    },
    [fetchAllWorkOrders, isAssignedToUser],
  );

  const calculateUserTotals = useCallback(
    async (targetUsers: User[]) => {
      const totals: Record<string, { workOrdersCount: number; billingTotal: number }> =
        {};
      targetUsers.forEach((u) => {
        totals[u._id] = { workOrdersCount: 0, billingTotal: 0 };
      });
      const mechanics = targetUsers.filter((u) => u.role === 'MECHANIC');
      await Promise.all(
        mechanics.map(async (m) => {
          const [all, delivered] = await Promise.all([
            fetchAllMechanicWorkOrders(m._id),
            fetchAllMechanicWorkOrders(m._id, 'DELIVERED'),
          ]);
          totals[m._id].workOrdersCount = all.filter(
            (o) => o.status !== 'CANCELLED',
          ).length;
          totals[m._id].billingTotal = delivered.reduce(
            (s, o) => s + Number(o.total || 0),
            0,
          );
        }),
      );
      setUserTotals(totals);
    },
    [fetchAllMechanicWorkOrders],
  );

  // ─── Carga principal ──────────────────────────────────────────────────────
  const fetchUsers = useCallback(
    async (silent = false): Promise<void> => {
      try {
        if (silent) setIsRefreshing(true);
        else setLoading(true);
        setError(null);

        if (isAdministrativePanel) {
          // ADMINISTRATIVE: solo mecánicos activos de la empresa
          const mechanics = await fetchAllPages<User, Record<string, unknown>>(
            usersApi.getMechanics as unknown as (
              p: Record<string, unknown>,
            ) => Promise<Record<string, unknown>>,
            {},
            'mechanics',
          );
          const list = Array.isArray(mechanics) ? mechanics : [];
          setUsers(list);
          await calculateUserTotals(list);
        } else {
          // ADMIN: mecánicos y administrativos de la empresa
          const all = await fetchAllPages<User, Record<string, unknown>>(
            usersApi.getUsers as unknown as (
              p: Record<string, unknown>,
            ) => Promise<Record<string, unknown>>,
            { includeInactive: true },
            'users',
          );
          const list = Array.isArray(all)
            ? all.filter((u) => u.role === 'MECHANIC' || u.role === 'ADMINISTRATIVE')
            : [];
          setUsers(list);
          await calculateUserTotals(list);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudieron obtener los datos.',
        );
      } finally {
        if (silent) setIsRefreshing(false);
        else setLoading(false);
      }
    },
    [isAdministrativePanel, calculateUserTotals],
  );

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // ─── Acciones de modal ────────────────────────────────────────────────────
  const handleOpenModal = (target?: User) => {
    if (!canEditUsers) return;
    setEditingUser(target ?? null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setRecentWorkOrders([]);
  };

  const handleOpenMetricsModal = async (target: User) => {
    setMetricsUser(target);
    setIsMetricsModalOpen(true);
    if (target.role !== 'MECHANIC') return;
    setIsMetricsLoading(true);
    setMetricsError(null);
    setLoadingRecent(true);
    try {
      const [all, delivered] = await Promise.all([
        fetchAllMechanicWorkOrders(target._id),
        fetchAllMechanicWorkOrders(target._id, 'DELIVERED'),
      ]);
      setRecentWorkOrders(
        all
          .sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 4),
      );
      setMechanicMetrics((prev) => ({
        ...prev,
        [target._id]: {
          completedCount: delivered.length,
          deliveredCount: delivered.length,
          deliveredTotal: delivered.reduce((s, wo) => s + Number(wo.total || 0), 0),
          assignedCount: all.filter((wo) => wo.status !== 'CANCELLED').length,
        },
      }));
    } catch {
      setMetricsError('No se pudieron cargar las métricas.');
      setMechanicMetrics((prev) => ({
        ...prev,
        [target._id]: {
          completedCount: 0,
          deliveredCount: 0,
          deliveredTotal: 0,
          assignedCount: 0,
        },
      }));
      setRecentWorkOrders([]);
    } finally {
      setIsMetricsLoading(false);
      setLoadingRecent(false);
    }
  };

  const handleOpenToggleModal = (
    id: string,
    name: string,
    type: 'ACTIVATE' | 'DEACTIVATE',
  ) => {
    setUserToToggle({ id, name });
    setModalType(type);
    setIsToggleModalOpen(true);
  };

  const handleToggleConfirm = async () => {
    if (!userToToggle || !modalType) return;
    try {
      setSubmitting(true);
      if (modalType === 'DEACTIVATE') await usersApi.deactivateUser(userToToggle.id);
      else await usersApi.activateUser(userToToggle.id);
      setIsToggleModalOpen(false);
      setUserToToggle(null);
      setModalType(null);
      void fetchUsers(true);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'Error al cambiar el estado del usuario',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Filtrado ─────────────────────────────────────────────────────────────
  const visibleUsers = useMemo(() => {
    const term = normalizeString(searchTerm);
    return users.filter((u) => {
      if (
        term &&
        !normalizeString(u.name).includes(term) &&
        !normalizeString(u.email).includes(term)
      )
        return false;
      if (!canEditUsers) return u.active;
      return true;
    });
  }, [users, searchTerm, canEditUsers]);

  const roleFilteredUsers = useMemo(() => {
    switch (activeRoleFilter) {
      case 'ALL':
        return visibleUsers.filter((u) => u.active);
      case 'ACTIVE':
        return visibleUsers.filter((u) => u.active);
      case 'INACTIVE':
        return visibleUsers.filter((u) => !u.active);
      case 'MECHANIC':
        return visibleUsers.filter((u) => u.role === 'MECHANIC' && u.active);
      case 'ADMINISTRATIVE':
        return visibleUsers.filter((u) => u.role === 'ADMINISTRATIVE' && u.active);
      default:
        return visibleUsers;
    }
  }, [visibleUsers, activeRoleFilter]);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const mechanicCount = users.filter((u) => u.role === 'MECHANIC' && u.active).length;
  const administrativeCount = users.filter(
    (u) => u.role === 'ADMINISTRATIVE' && u.active,
  ).length;
  const inactiveCount = visibleUsers.filter(
    (u) => !u.active && (u.role === 'MECHANIC' || u.role === 'ADMINISTRATIVE'),
  ).length;

  const statsItems: FilterStatsItem[] = isAdministrativePanel
    ? [
        {
          key: 'mechanic',
          label: 'Mecánicos',
          count: mechanicCount,
          isActive: activeRoleFilter === 'ALL',
          onClick: () => setActiveRoleFilter('ALL'),
        },
      ]
    : [
        {
          key: 'mechanic',
          label: 'Mecánicos',
          count: mechanicCount,
          colors: {
            background: '#0d1a2a',
            border: 'rgba(96, 165, 250, 0.45)',
            text: '#60a5fa',
            hoverBorder: 'rgba(96, 165, 250, 0.75)',
            activeBorder: '#60a5fa',
            activeRing: 'rgba(96, 165, 250, 0.35)',
          },
          isActive: activeRoleFilter === 'MECHANIC',
          onClick: () => setActiveRoleFilter('MECHANIC'),
        },
        {
          key: 'administrative',
          label: 'Administrativos',
          count: administrativeCount,
          colors: {
            background: '#2a230f',
            border: 'rgba(250, 204, 21, 0.45)',
            text: '#facc15',
            hoverBorder: 'rgba(250, 204, 21, 0.75)',
            activeBorder: '#facc15',
            activeRing: 'rgba(250, 204, 21, 0.35)',
          },
          isActive: activeRoleFilter === 'ADMINISTRATIVE',
          onClick: () => setActiveRoleFilter('ADMINISTRATIVE'),
        },
        {
          key: 'inactive',
          label: 'Inactivos',
          count: inactiveCount,
          colors: {
            background: '#20130f',
            border: 'rgba(239, 68, 68, 0.45)',
            text: '#f87171',
            hoverBorder: 'rgba(239, 68, 68, 0.75)',
            activeBorder: '#f87171',
            activeRing: 'rgba(248, 113, 113, 0.35)',
          },
          isActive: activeRoleFilter === 'INACTIVE',
          onClick: () => setActiveRoleFilter('INACTIVE'),
        },
        {
          key: 'all',
          label: 'Total Activos',
          count: users.filter(
            (u) => u.active && (u.role === 'MECHANIC' || u.role === 'ADMINISTRATIVE'),
          ).length,
          isActive: activeRoleFilter === 'ALL',
          onClick: () => setActiveRoleFilter('ALL'),
        },
      ];

  // ─── Columnas y acciones ──────────────────────────────────────────────────
  const userActions: RowAction<User>[] = [
    {
      key: 'metrics',
      icon: <BarChart3 size={16} />,
      label: 'Ver métricas',
      onClick: (u) => {
        void handleOpenMetricsModal(u);
      },
      show: (u) => u.role === 'MECHANIC' && u.active,
    },
    ...(canEditUsers
      ? [
          {
            key: 'edit',
            icon: <Edit2 size={16} />,
            label: 'Editar',
            onClick: (u: User) => handleOpenModal(u),
            show: (u: User) => u.active,
          },
        ]
      : []),
    {
      key: 'deactivate',
      icon: <UserX size={16} />,
      label: 'Desactivar',
      onClick: (u) => handleOpenToggleModal(u._id, u.name, 'DEACTIVATE'),
      show: (u) => canEditUsers && u.active,
    },
    {
      key: 'activate',
      icon: <UserCheck size={16} />,
      label: 'Activar',
      onClick: (u) => handleOpenToggleModal(u._id, u.name, 'ACTIVATE'),
      show: (u) => canEditUsers && !u.active,
    },
  ];

  const userColumns: ColumnDef<User>[] = [
    {
      key: 'user',
      header: 'USUARIO',
      gridArea: 'user',
      cell: (u) => (
        <div className="user-main-info">
          <div className="user-avatar">{u.name.charAt(0).toUpperCase()}</div>
          <div className="user-name-wrapper">
            <span className="name-text">{u.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'CONTACTO',
      gridArea: 'contact',
      cell: (u) => (
        <div className="contact-item">
          <Mail size={14} />
          <span>{u.email}</span>
        </div>
      ),
    },
    ...(!isAdministrativePanel
      ? [
          {
            key: 'role',
            header: 'ROL',
            gridArea: 'role',
            cell: (u: User): BadgeConfig => {
              const map: Record<string, { label: string; className: string }> = {
                MECHANIC: { label: 'Mecánico', className: 'users-dl-badge--mechanic' },
                ADMINISTRATIVE: {
                  label: 'Administrativo',
                  className: 'users-dl-badge--administrative',
                },
                ADMIN: { label: 'Administrador', className: 'users-dl-badge--active' },
              };
              return {
                label: map[u.role]?.label ?? 'Desconocido',
                variant: 'default',
                className: map[u.role]?.className ?? '',
              };
            },
          },
        ]
      : []),
    ...(isAdministrativePanel
      ? [
          {
            key: 'workOrders',
            header: 'ALBARANES',
            gridArea: 'workOrders',
            cell: (u: User) => userTotals[u._id]?.workOrdersCount ?? 0,
          },
          {
            key: 'billing',
            header: 'IMPORTE',
            gridArea: 'billing',
            cell: (u: User) =>
              (userTotals[u._id]?.billingTotal ?? 0).toLocaleString('es-ES', {
                style: 'currency',
                currency: 'EUR',
              }),
          },
        ]
      : []),
  ];

  const gridTemplateAreas = isAdministrativePanel
    ? {
        base: `"user user user"\n"contact contact contact"\n"workOrders billing actions"`,
        tablet: `"user user contact contact contact contact"\n"workOrders workOrders billing actions actions actions"`,
        desktop: `"user contact workOrders billing actions"`,
      }
    : {
        base: `"user user user"\n"contact contact contact"\n"role role actions"`,
        tablet: `"user user user role role"\n"contact contact contact actions actions"`,
        desktop: `"user contact role actions"`,
      };

  const gridTemplateColumns = isAdministrativePanel
    ? 'minmax(200px, 2.2fr) minmax(180px, 1.9fr) 120px 130px 100px'
    : 'minmax(200px, 2.4fr) minmax(180px, 2fr) 130px 100px';

  const handleRowClick = (u: User) => {
    if (!u.active) return;
    if (canEditUsers) {
      handleOpenModal(u);
      return;
    }
    if (u.role === 'MECHANIC') void handleOpenMetricsModal(u);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <PageShell
        className="users-page users-page--management"
        header={
          <div className="page-shell-header">
            <div className="page-shell-heading">
              <h1 className="page-shell-title">
                {isAdministrativePanel ? 'Actividad de Mecánicos' : 'Gestión de Usuarios'}
              </h1>
              <div className="page-shell-subtitle-row">
                <p className="page-shell-subtitle">
                  {visibleUsers.length} registros totales
                </p>
                <RefreshButton
                  onRefresh={() => fetchUsers(true)}
                  isRefreshing={isRefreshing}
                  isLoading={loading}
                  ariaLabel="Actualizar usuarios"
                />
              </div>
            </div>
            <div className="page-shell-actions">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por nombre o email..."
                ariaLabel={isAdministrativePanel ? 'Buscar mecánicos' : 'Buscar usuarios'}
              />
              {canEditUsers && (
                <button
                  type="button"
                  className="page-shell-create-button"
                  onClick={() => handleOpenModal()}
                >
                  <UserPlus size={18} />
                  <span>Nuevo Usuario</span>
                </button>
              )}
            </div>
          </div>
        }
        loading={
          loading && users.length === 0 ? (
            <div className="users-loading">Cargando equipo...</div>
          ) : error ? (
            <div className="users-error">
              <div>
                <div className="users-error-title">Error al cargar usuarios</div>
                <div className="users-error-message">{error}</div>
              </div>
              <button type="button" className="retry-btn" onClick={() => fetchUsers()}>
                Reintentar
              </button>
            </div>
          ) : undefined
        }
        stats={
          isAdministrativePanel ? undefined : (
            <FilterStats
              items={statsItems}
              tabletColumns={statsItems.length === 4 ? 2 : undefined}
            />
          )
        }
        filterIndicator={
          isAdministrativePanel ? undefined : (
            <div style={{ marginBottom: '14px' }}>
              <p className="active-filter-indicator" style={{ margin: 0 }}>
                Filtro activo:{' '}
                <strong>
                  {
                    {
                      ALL: 'Total Activos',
                      MECHANIC: 'Mecánicos',
                      ADMINISTRATIVE: 'Administrativos',
                      ACTIVE: 'Activos',
                      INACTIVE: 'Inactivos',
                    }[activeRoleFilter]
                  }
                </strong>
              </p>
            </div>
          )
        }
      >
        <div className="users-datalist">
          <DataList
            columns={userColumns}
            data={roleFilteredUsers}
            actions={userActions}
            rowKey={(u) => u._id}
            variant="dark"
            alignActionsTop
            actionsAlign="right"
            onRowClick={handleRowClick}
            emptyMessage={
              searchTerm
                ? `No hay usuarios que coincidan con "${searchTerm}"`
                : 'No hay registros.'
            }
            rowClassName={(u) => (!u.active ? 'dl-row--inactive' : '')}
            gridTemplateAreas={gridTemplateAreas}
            gridTemplateColumns={gridTemplateColumns}
          />
        </div>
      </PageShell>

      <UserModal
        isOpen={isModalOpen}
        editingUser={editingUser}
        onClose={handleCloseModal}
        onSaved={() => fetchUsers()}
        onCreate={async (data) => {
          await usersApi.createUser(data);
        }}
        onUpdate={async (id, data) => {
          await usersApi.updateUser(id, data);
        }}
      />

      <ConfirmModal
        isOpen={isToggleModalOpen && !!userToToggle && !!modalType}
        title={modalType === 'DEACTIVATE' ? 'Desactivar Usuario' : 'Activar Usuario'}
        description={
          userToToggle && modalType
            ? `¿Estás seguro de que deseas ${modalType === 'DEACTIVATE' ? 'desactivar' : 'activar'} al usuario "${userToToggle.name}"?`
            : ''
        }
        confirmText={
          modalType === 'DEACTIVATE'
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
          setIsToggleModalOpen(false);
          setUserToToggle(null);
          setModalType(null);
        }}
        loading={submitting}
        icon={modalType === 'DEACTIVATE' ? <UserX size={24} /> : <UserCheck size={24} />}
        iconClassName={modalType === 'DEACTIVATE' ? 'deactivate' : 'success'}
        confirmClassName={modalType === 'DEACTIVATE' ? 'deactivate' : 'success'}
      />

      <MechanicMetricsModal
        isOpen={isMetricsModalOpen}
        onClose={() => {
          setIsMetricsModalOpen(false);
          setMetricsUser(null);
          setMetricsError(null);
          setRecentWorkOrders([]);
        }}
        user={metricsUser}
        metrics={metricsUser ? mechanicMetrics[metricsUser._id] : null}
        loading={isMetricsLoading}
        recentWorkOrders={recentWorkOrders}
        onWorkOrderClick={(id) => {
          setSelectedOrderId(id);
          setIsWorkOrderModalOpen(true);
        }}
      />

      <WorkOrderModal
        isOpen={isWorkOrderModalOpen}
        onClose={() => {
          setIsWorkOrderModalOpen(false);
          setSelectedOrderId(null);
        }}
        orderId={selectedOrderId}
        onUpdate={() => fetchUsers(true)}
      />
    </>
  );
};

export default Users;
