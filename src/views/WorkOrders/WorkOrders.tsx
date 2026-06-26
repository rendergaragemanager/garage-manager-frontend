import { Car, Download, Edit2, Eye, Mail, Plus, User } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import './WorkOrders.css';
import {
  DataList,
  type BadgeConfig,
  type ColumnDef,
  type RowAction,
} from '../../components/DataList/DataList';
import FilterStats, {
  type FilterStatsItem,
} from '../../components/FilterStats/FilterStats';
import WorkOrderModal from '../../components/modals/workorders/WorkOrderModal';
import PageShell from '../../components/PageShell/PageShell';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import SearchBar from '../../components/SearchBar/SearchBar';
import { useUserData } from '../../context/UserContext/UserContext';
import { getClients } from '../../services/api/clients.api';
import { getWorkOrders } from '../../services/api/workOrders.api';
import { SERVICE_TYPE_LABELS } from '../../types/budget.types';
import type { Client } from '../../types/client.types';
import type { WorkOrder } from '../../types/workOrder.types';
import { fetchAllPages } from '../../utils/apiUtils';
import { normalizeString } from '../../utils/stringUtils';

type WorkOrdersFilter =
  | 'ALL'
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING_DELIVERY'
  | 'DELIVERED';

const WorkOrders = () => {
  const navigate = useNavigate();
  const { user } = useUserData();

  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<WorkOrdersFilter>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderToPrint, setOrderToPrint] = useState<WorkOrder | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  const selectedOrderNumber = useMemo(() => {
    if (!selectedOrderId) return undefined;
    const order = orders.find((o) => o._id === selectedOrderId);
    return order?.workOrderNumber ? `#${order.workOrderNumber}` : undefined;
  }, [selectedOrderId, orders]);

  useEffect(() => {
    if (orderToPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [orderToPrint]);

  useEffect(() => {
    const handleAfterPrint = () => setOrderToPrint(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const orderToPrintNumber = orderToPrint?.workOrderNumber
    ? `#${orderToPrint.workOrderNumber}`
    : '';

  const printEditTotal = useMemo(() => {
    if (!orderToPrint) return 0;
    return orderToPrint.items.reduce(
      (acc, item) => acc + (Number(item.subtotal) || 0),
      0,
    );
  }, [orderToPrint]);

  const role = user?.role;
  const isManagement =
    role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'ADMINISTRATIVE';
  const canCreateWorkOrder = role === 'ADMIN' || role === 'ADMINISTRATIVE';

  const visibleOrders = isManagement
    ? orders
    : orders.filter((order) => order.status !== 'CANCELLED');

  const normalizedSearchTerm = normalizeString(searchTerm).trim();
  const normalizedSearchDigits = normalizedSearchTerm.replace(/\D/g, '');

  const searchMatchedOrders = visibleOrders.filter((order) => {
    if (!isManagement || !normalizedSearchTerm) return true;

    const description = normalizeString(order.description);
    const vehicle = normalizeString(
      `${order.vehicle?.brand ?? ''} ${order.vehicle?.model ?? ''} ${order.vehicle?.plate ?? ''}`,
    );
    const client = normalizeString(
      `${order.client?.name ?? ''} ${order.client?.telephone ?? ''}`,
    );
    const createdDate = new Date(order.createdAt);
    const createdDateEs = normalizeString(
      createdDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    );
    const createdDateIso = normalizeString(createdDate.toISOString().slice(0, 10));
    const createdDateDigits = createdDateEs.replace(/\D/g, '');

    const matchesDate =
      createdDateEs.includes(normalizedSearchTerm) ||
      createdDateIso.includes(normalizedSearchTerm) ||
      (normalizedSearchDigits.length > 0 &&
        createdDateDigits.includes(normalizedSearchDigits));

    return (
      description.includes(normalizedSearchTerm) ||
      vehicle.includes(normalizedSearchTerm) ||
      client.includes(normalizedSearchTerm) ||
      matchesDate
    );
  });

  const totalCount = searchMatchedOrders.length;
  const pendingCount = searchMatchedOrders.filter((order) =>
    isManagement ? order.status === 'PENDING' : order.status === 'ASSIGNED',
  ).length;
  const assignedCount = searchMatchedOrders.filter(
    (order) => order.status === 'ASSIGNED',
  ).length;
  const inProgressCount = searchMatchedOrders.filter(
    (order) => order.status === 'IN_PROGRESS',
  ).length;
  const pendingDeliveryCount = searchMatchedOrders.filter(
    (order) => order.status === 'COMPLETED',
  ).length;
  const deliveredCount = searchMatchedOrders.filter((order) =>
    isManagement
      ? order.status === 'DELIVERED'
      : order.status === 'COMPLETED' || order.status === 'DELIVERED',
  ).length;

  const filters: WorkOrdersFilter[] = isManagement
    ? ['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_DELIVERY', 'DELIVERED']
    : ['ALL', 'PENDING', 'IN_PROGRESS', 'DELIVERED'];

  const filteredOrders = searchMatchedOrders.filter((order) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PENDING') {
      return isManagement ? order.status === 'PENDING' : order.status === 'ASSIGNED';
    }
    if (activeFilter === 'ASSIGNED') {
      return isManagement && order.status === 'ASSIGNED';
    }
    if (activeFilter === 'IN_PROGRESS') {
      return order.status === 'IN_PROGRESS';
    }
    if (activeFilter === 'PENDING_DELIVERY') {
      return order.status === 'COMPLETED';
    }
    if (activeFilter === 'DELIVERED') {
      return isManagement
        ? order.status === 'DELIVERED'
        : order.status === 'COMPLETED' || order.status === 'DELIVERED';
    }
    return true;
  });

  const emptyStateByFilter: Record<WorkOrdersFilter, string> = isManagement
    ? {
        ALL: 'No hay albaranes.',
        PENDING: 'No hay albaranes pendientes de asignación.',
        ASSIGNED: 'No hay albaranes asignados.',
        IN_PROGRESS: 'No hay albaranes en proceso.',
        PENDING_DELIVERY: 'No hay albaranes pendientes de entrega.',
        DELIVERED: 'No hay albaranes finalizados.',
      }
    : {
        ALL: 'No tienes órdenes asignadas.',
        PENDING: 'No tienes órdenes pendientes.',
        ASSIGNED: 'No tienes órdenes asignadas.',
        IN_PROGRESS: 'No tienes órdenes en proceso.',
        PENDING_DELIVERY: 'No tienes órdenes completadas.',
        DELIVERED: 'No tienes órdenes completadas.',
      };

  const filterLabelByType: Record<WorkOrdersFilter, string> = isManagement
    ? {
        ALL: 'Total',
        PENDING: 'Pend. asignación',
        ASSIGNED: 'Asignados',
        IN_PROGRESS: 'En proceso',
        PENDING_DELIVERY: 'Pend. entrega',
        DELIVERED: 'Finalizados',
      }
    : {
        ALL: 'Total',
        PENDING: 'Pendientes',
        ASSIGNED: 'Asignadas',
        IN_PROGRESS: 'En proceso',
        PENDING_DELIVERY: 'Completadas',
        DELIVERED: 'Completadas',
      };

  const statusLabel: Record<WorkOrder['status'], string> = isManagement
    ? {
        PENDING: 'Pend. asignación',
        ASSIGNED: 'Asignado',
        IN_PROGRESS: 'En proceso',
        COMPLETED: 'Pend. entrega',
        CANCELLED: 'Cancelado',
        DELIVERED: 'Finalizado',
      }
    : {
        PENDING: 'Pendiente',
        ASSIGNED: 'Pendiente',
        IN_PROGRESS: 'En proceso',
        COMPLETED: 'Completada',
        CANCELLED: 'Cancelada',
        DELIVERED: 'Entregada',
      };

  const fetchAllWorkOrders = useCallback(async (): Promise<WorkOrder[]> => {
    return fetchAllPages<WorkOrder, Record<string, unknown>>(
      getWorkOrders as unknown as (
        params: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>,
      {},
      'workOrders',
    );
  }, []);

  const fetchAllClients = useCallback(async (): Promise<Client[]> => {
    return fetchAllPages<Client, Record<string, unknown>>(
      getClients as unknown as (
        params: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>,
      {},
      'clients',
    );
  }, []);

  const loadWorkOrders = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const allOrders = await fetchAllWorkOrders();
        setOrders(allOrders);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Error al cargar las órdenes';
        setError(message);
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [fetchAllWorkOrders],
  );

  const loadClients = useCallback(async () => {
    try {
      const allClients = await fetchAllClients();
      setClients(allClients);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    }
  }, [fetchAllClients]);

  useEffect(() => {
    loadWorkOrders();
    loadClients();
  }, [loadWorkOrders, loadClients]);

  const handleOpenCreateModal = () => {
    if (!canCreateWorkOrder) return;
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleCreatedWorkOrder = async () => {
    setIsCreateModalOpen(false);
    await loadWorkOrders(true);
  };

  const handleOpenDetailModal = (orderId: string) => {
    setSelectedOrderId(orderId);
  };

  const handleCloseDetailModal = () => {
    setSelectedOrderId(null);
  };

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const getStatusBadge = (status: WorkOrder['status']): BadgeConfig => {
    if (status === 'PENDING') {
      return {
        label: statusLabel[status],
        variant: 'default',
        className: 'workorders-dl-badge--pending-assignment',
      };
    }

    if (status === 'ASSIGNED') {
      return {
        label: statusLabel[status],
        variant: 'default',
        className: 'workorders-dl-badge--assigned',
      };
    }

    if (status === 'IN_PROGRESS') {
      return {
        label: statusLabel[status],
        variant: 'default',
        className: 'workorders-dl-badge--in-progress',
      };
    }

    if (status === 'COMPLETED') {
      return {
        label: statusLabel[status],
        variant: 'default',
        className: 'workorders-dl-badge--pending-delivery',
      };
    }

    if (status === 'DELIVERED') {
      return {
        label: statusLabel[status],
        variant: 'default',
        className: 'workorders-dl-badge--delivered',
      };
    }

    if (status === 'CANCELLED') {
      return {
        label: statusLabel[status],
        variant: 'default',
        className: 'workorders-dl-badge--cancelled',
      };
    }

    return { label: statusLabel[status], variant: 'default' };
  };

  const handleSendEmail = (order: WorkOrder) => {
    const orderNumber = order.workOrderNumber ? `#${order.workOrderNumber}` : 'S/N';

    const clientName = order.client?.name || 'Cliente';
    const clientEmail = order.client?.email || '';
    const vehicleInfo = `${order.vehicle?.brand} ${order.vehicle?.model} (${order.vehicle?.plate})`;

    const subject = `Detalles de Orden #${orderNumber} - ${user?.companyName || 'Mi Taller'}`;

    let body = `Hola ${clientName},\n\n`;
    body += `Adjuntamos los detalles de la orden de trabajo para su vehículo ${vehicleInfo}:\n\n`;

    if (order.description) {
      body += `Descripción: ${order.description}\n\n`;
    }

    body += `Conceptos:\n`;
    order.items.forEach((item) => {
      body += `- ${item.description}: ${item.quantity} x ${item.unitPrice.toLocaleString(
        'es-ES',
        { style: 'currency', currency: 'EUR' },
      )} = ${item.subtotal.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
      })}\n`;
    });

    const iva = order.total * 0.21;
    const finalTotal = order.total + iva;

    body += `\nBase Imponible: ${order.total.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
    })}\n`;
    body += `IVA (21%): ${iva.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
    })}\n`;
    body += `TOTAL: ${finalTotal.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
    })}\n\n`;

    body += `Quedamos a su disposición para cualquier duda.\n`;
    body += `Saludos,\n`;
    body += `${user?.companyName || 'Mi Taller'}`;

    const mailtoUrl = `mailto:${clientEmail}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
  };

  const managementColumns: ColumnDef<WorkOrder>[] = [
    {
      key: 'number',
      header: 'Nº',
      gridArea: 'number',
      cell: (order) => (
        <span className="workorders-number-cell">
          {order.workOrderNumber ? `#${order.workOrderNumber}` : '---'}
        </span>
      ),
    },

    {
      key: 'date',
      header: 'FECHA',
      gridArea: 'date',
      cell: (order) => (
        <span className="workorders-date-cell">{formatDate(order.createdAt)}</span>
      ),
    },
    {
      key: 'serviceType',
      header: 'TIPO',
      gridArea: 'serviceType',
      cell: (order) => (
        <span
          className={`service-type-badge service-type-badge--${order.serviceType?.toLowerCase() || 'repair'}`}
        >
          {SERVICE_TYPE_LABELS[order.serviceType || 'REPAIR']}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'ESTADO',
      gridArea: 'status',
      cell: (order) => getStatusBadge(order.status),
    },
    {
      key: 'description',
      header: 'DESCRIPCION',
      gridArea: 'description',
      cell: (order) => (
        <span className="workorders-description-datalist">{order.description}</span>
      ),
    },
    {
      key: 'vehicleClient',
      header: 'VEHICULO / CLIENTE',
      gridArea: 'vehicleClient',
      cell: (order) => (
        <div className="workorders-vehicle-client">
          <div className="workorders-vehicle-row">
            <Car size={16} className="workorders-entity-icon" />
            <span className="workorders-entity-text">
              {order.vehicle?.brand} {order.vehicle?.model}
            </span>
          </div>
          <div className="workorders-client-row">
            <User size={16} className="workorders-entity-icon" />
            <span className="workorders-entity-text">{order.client?.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'TOTAL',
      gridArea: 'total',
      cell: (order) => (
        <span className="total-amount">
          {(Number(order.total) || 0).toLocaleString('es-ES', {
            style: 'currency',
            currency: 'EUR',
          })}
        </span>
      ),
    },
  ];

  const managementActions: RowAction<WorkOrder>[] = [
    {
      key: 'view',
      icon: <Eye size={18} />,
      label: 'Ver orden',
      onClick: (order) => handleOpenDetailModal(order._id),
      show: (order) => order.status === 'DELIVERED' || order.status === 'CANCELLED',
    },
    {
      key: 'edit',
      icon: <Edit2 size={18} />,
      label: 'Editar orden',
      onClick: (order) => handleOpenDetailModal(order._id),
      show: (order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED',
    },
    {
      key: 'email',
      icon: <Mail size={18} />,
      label: 'Enviar por email',
      onClick: (order) => handleSendEmail(order),
      show: (order) => order.status === 'COMPLETED' || order.status === 'DELIVERED',
    },
    {
      key: 'download',
      icon: <Download size={18} />,
      label: 'Descargar documento',
      onClick: (order) => setOrderToPrint(order),
      show: (order) => order.status === 'COMPLETED' || order.status === 'DELIVERED',
    },
  ];

  const statsItems: FilterStatsItem[] = [
    {
      key: 'pending',
      label: isManagement ? 'Pend. asignación' : 'Pendientes',
      count: pendingCount,
      colors: isManagement
        ? {
            background: '#2a150f',
            border: 'rgba(249, 115, 22, 0.5)',
            text: '#fb923c',
            activeBorder: '#fb923c',
            activeRing: 'rgba(251, 146, 60, 0.35)',
          }
        : {
            background: '#2a150f',
            border: 'rgba(249, 115, 22, 0.5)',
            text: '#fb923c',
            activeBorder: '#fb923c',
            activeRing: 'rgba(251, 146, 60, 0.35)',
          },
      isActive: activeFilter === 'PENDING',
      onClick: () => setActiveFilter('PENDING'),
      hidden: !filters.includes('PENDING'),
    },
    {
      key: 'pending-delivery',
      label: 'Pend. entrega',
      count: pendingDeliveryCount,
      colors: {
        background: '#2a230f',
        border: 'rgba(234, 179, 8, 0.5)',
        text: '#facc15',
        activeBorder: '#facc15',
        activeRing: 'rgba(250, 204, 21, 0.35)',
      },
      isActive: activeFilter === 'PENDING_DELIVERY',
      onClick: () => setActiveFilter('PENDING_DELIVERY'),
      hidden: !(isManagement && filters.includes('PENDING_DELIVERY')),
    },
    {
      key: 'assigned',
      label: isManagement ? 'Asignados' : 'Asignadas',
      count: assignedCount,
      colors: {
        background: '#0f1f2e',
        border: 'rgba(59, 130, 246, 0.5)',
        text: '#60a5fa',
        activeBorder: '#60a5fa',
        activeRing: 'rgba(96, 165, 250, 0.35)',
      },
      isActive: activeFilter === 'ASSIGNED',
      onClick: () => setActiveFilter('ASSIGNED'),
      hidden: !(isManagement && filters.includes('ASSIGNED')),
    },
    {
      key: 'in-progress',
      label: 'En proceso',
      count: inProgressCount,
      colors: isManagement
        ? {
            background: '#0d1a2a',
            border: 'rgba(59, 130, 246, 0.45)',
            text: '#93c5fd',
            activeBorder: '#93c5fd',
            activeRing: 'rgba(147, 197, 253, 0.35)',
          }
        : {
            background: '#0d1a2a',
            border: 'rgba(59, 130, 246, 0.45)',
            text: '#60a5fa',
            hoverBorder: 'rgba(59, 130, 246, 0.75)',
            activeBorder: '#60a5fa',
            activeRing: 'rgba(96, 165, 250, 0.35)',
          },
      isActive: activeFilter === 'IN_PROGRESS',
      onClick: () => setActiveFilter('IN_PROGRESS'),
      hidden: !filters.includes('IN_PROGRESS'),
    },
    {
      key: 'delivered',
      label: isManagement ? 'Finalizados' : 'Completadas',
      count: deliveredCount,
      colors: isManagement
        ? {
            background: '#0f2a1f',
            border: 'rgba(16, 185, 129, 0.5)',
            text: '#34d399',
            activeBorder: '#34d399',
            activeRing: 'rgba(52, 211, 153, 0.35)',
          }
        : {
            background: '#0d201a',
            border: 'rgba(16, 185, 129, 0.45)',
            text: '#34d399',
            hoverBorder: 'rgba(16, 185, 129, 0.75)',
            activeBorder: '#34d399',
            activeRing: 'rgba(52, 211, 153, 0.35)',
          },
      isActive: activeFilter === 'DELIVERED',
      onClick: () => setActiveFilter('DELIVERED'),
      hidden: !filters.includes('DELIVERED'),
    },
    {
      key: 'all',
      label: 'Total',
      count: totalCount,
      isActive: activeFilter === 'ALL',
      onClick: () => setActiveFilter('ALL'),
      hidden: !filters.includes('ALL'),
    },
  ];

  return (
    <PageShell
      className={`workorders-page ${isManagement ? 'workorders-page--management' : ''}`}
      header={
        <div className="page-shell-header">
          <div className="page-shell-heading">
            <h1 className="page-shell-title">
              {isManagement ? 'Gestión de Albaranes' : 'Mis Órdenes'}
            </h1>

            <div className="page-shell-subtitle-row">
              <p className="page-shell-subtitle">
                {totalCount} {isManagement ? 'registros totales' : 'órdenes asignadas'}
              </p>

              {isManagement && (
                <RefreshButton
                  onRefresh={() => loadWorkOrders(true)}
                  isRefreshing={isRefreshing}
                  isLoading={loading}
                  ariaLabel="Actualizar albaranes"
                />
              )}
            </div>
          </div>

          <div className="page-shell-actions">
            {isManagement && (
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Cliente, vehículo, descripción, fecha..."
                ariaLabel="Buscar albaranes"
              />
            )}

            {canCreateWorkOrder && (
              <button
                type="button"
                className="page-shell-create-button"
                onClick={() => void handleOpenCreateModal()}
                disabled={loading}
              >
                <Plus size={16} />
                Nuevo Albarán
              </button>
            )}

            {!isManagement && (
              <button
                type="button"
                className="refresh-button"
                onClick={() => loadWorkOrders(true)}
                disabled={loading || isRefreshing}
              >
                {isRefreshing ? 'Actualizando...' : 'Refrescar'}
              </button>
            )}
          </div>
        </div>
      }
      notice={
        error ? (
          <section className="workorders-error" role="alert" aria-live="polite">
            <div className="workorders-error-copy">
              <p className="workorders-error-title">No pudimos actualizar las órdenes</p>
              <p className="workorders-error-message">{error}</p>
            </div>
            <button
              type="button"
              className="retry-button"
              onClick={() => loadWorkOrders(true)}
              disabled={isRefreshing}
            >
              Reintentar
            </button>
          </section>
        ) : undefined
      }
      stats={<FilterStats items={statsItems} />}
      filterIndicator={
        <p className="active-filter-indicator">
          Filtro activo: <strong>{filterLabelByType[activeFilter]}</strong>
        </p>
      }
      loading={
        loading ? (
          <section className="workorders-loading">Cargando órdenes...</section>
        ) : undefined
      }
    >
      <section className={`orders-list ${isManagement ? 'orders-list--management' : ''}`}>
        {filteredOrders.length === 0 ? (
          <div className="workorders-empty">{emptyStateByFilter[activeFilter]}</div>
        ) : isManagement ? (
          <DataList
            columns={managementColumns}
            data={filteredOrders}
            rowKey={(order) => order._id}
            actions={managementActions}
            variant="dark"
            alignActionsTop
            gridTemplateAreas={{
              base: `
                "number date"
                "serviceType total"
                "description description"
                "vehicleClient vehicleClient"
                "status actions"
              `,
              tablet: `
                "number vehicleClient serviceType date total"
                "description description description description description"
                "status status status status actions"
              `,
              desktop: `"number date serviceType description vehicleClient total status actions"`,
            }}
            gridTemplateColumns="100px 110px 150px minmax(220px, 1fr) minmax(180px, 0.8fr) 120px 140px 100px"
            emptyMessage={emptyStateByFilter[activeFilter]}
            onRowClick={(order) => handleOpenDetailModal(order._id)}
          />
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order._id}
              className="order-card"
              onClick={() =>
                navigate(
                  isManagement
                    ? `/app/albaranes/${order._id}`
                    : `/app/ordenes-trabajo/${order._id}`,
                )
              }
            >
              <div className="order-header">
                <h3>{formatDate(order.createdAt)}</h3>
                <span className={`status ${order.status}`}>
                  {statusLabel[order.status]}
                </span>
              </div>

              <p className="description">{order.description}</p>

              <div className="info">
                <div className="info-chip">
                  <Car size={16} />
                  <div className="info-chip-content">
                    <p>
                      {order.vehicle?.brand} {order.vehicle?.model}
                    </p>
                    <span>{order.vehicle?.plate}</span>
                  </div>
                </div>
                <div className="info-chip">
                  <User size={16} />
                  <div className="info-chip-content">
                    <p>{order.client?.name}</p>
                    <span>{order.client?.telephone}</span>
                  </div>
                </div>
              </div>

              <span className="tasks">{order.items.length} items</span>
            </div>
          ))
        )}
      </section>

      <WorkOrderModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        orderId={null} //modo creación
        onCreated={() => void handleCreatedWorkOrder()}
      />

      <WorkOrderModal
        isOpen={isManagement && !!selectedOrderId}
        onClose={handleCloseDetailModal}
        orderId={selectedOrderId} // modo edición
        orderNumber={selectedOrderNumber}
        onUpdate={() => void loadWorkOrders(true)}
      />

      {/* version imprimible */}
      {orderToPrint &&
        createPortal(
          <div id="printable-workorder" className="printable-workorder-container">
            <div className="print-header">
              <div className="print-logo-container">
                <img
                  src={user?.companyLogo?.url || '/logos/Logo.png'}
                  alt="Logo"
                  className="print-logo"
                />
              </div>
              <div className="print-company-info">
                <h1 className="print-company-name">
                  {user?.companyName || 'GARAGE MANAGER'}
                </h1>
                <p>CIF: {user?.companyDocument || 'No disponible'}</p>
                <p>{user?.companyAddress?.street || 'No disponible'}</p>
                <p>
                  {user?.companyAddress?.zipCode || 'No disponible'}{' '}
                  {user?.companyAddress?.city || 'No disponible'} (
                  {user?.companyAddress?.country || 'No disponible'})
                </p>
                <p>Tel: {user?.companyPhone || 'No disponible'}</p>
              </div>
              <div className="print-workorder-meta">
                <h2>ALBARÁN</h2>
                <div className="meta-row">
                  <span>Nº: </span>
                  <strong>#{orderToPrintNumber}</strong>
                </div>
                <div className="meta-row">
                  <span>Fecha emisión: </span>
                  <strong>
                    {new Date(orderToPrint.createdAt).toLocaleDateString('es-ES')}
                  </strong>
                </div>
                <div className="meta-row">
                  <span>Estado: </span>
                  <strong>{statusLabel[orderToPrint.status]}</strong>
                </div>
              </div>
            </div>

            <div className="print-details-grid">
              <div className="print-details-section">
                <h3>DATOS DEL CLIENTE</h3>
                <p>
                  <strong>Nombre:</strong> {orderToPrint.client?.name}
                </p>
                {clients.find((c) => c._id === orderToPrint.client?._id)
                  ?.documentNumber && (
                  <p>
                    <strong>DNI/CIF:</strong>{' '}
                    {
                      clients.find((c) => c._id === orderToPrint.client?._id)
                        ?.documentNumber
                    }
                  </p>
                )}
                {orderToPrint.client?.telephone && (
                  <p>
                    <strong>Teléfono:</strong> {orderToPrint.client.telephone}
                  </p>
                )}
                {orderToPrint.client?.email && (
                  <p>
                    <strong>Email:</strong> {orderToPrint.client.email}
                  </p>
                )}
                {(() => {
                  const c = clients.find((c) => c._id === orderToPrint.client?._id);
                  return (
                    c?.address && (
                      <p>
                        <strong>Dirección:</strong>{' '}
                        {`${c.address.street || ''}, ${c.address.zipCode || ''} ${c.address.city || ''} (${c.address.country || ''})`}
                      </p>
                    )
                  );
                })()}
              </div>
              <div className="print-details-section">
                <h3>DATOS DEL VEHÍCULO</h3>
                <p>
                  <strong>Vehículo:</strong> {orderToPrint.vehicle?.brand}{' '}
                  {orderToPrint.vehicle?.model} ({orderToPrint.vehicle?.plate})
                </p>
                <p>
                  <strong>Kilómetros:</strong>{' '}
                  {typeof orderToPrint.kms === 'number'
                    ? `${Math.trunc(orderToPrint.kms).toLocaleString('es-ES')} km`
                    : typeof orderToPrint.vehicle?.kms === 'number'
                      ? `${Math.trunc(orderToPrint.vehicle.kms).toLocaleString('es-ES')} km`
                      : 'N/A'}
                </p>
              </div>
            </div>

            <div className="print-description">
              <h3>DESCRIPCIÓN DEL TRABAJO</h3>
              <p>{orderToPrint.description}</p>
            </div>

            <table className="print-items-table">
              <thead>
                <tr>
                  <th>DESCRIPCIÓN</th>
                  <th className="text-center">CANTIDAD</th>
                  <th className="text-right">PRECIO UNITARIO</th>
                  <th className="text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {orderToPrint.items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.description}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">
                      {(Number(item.unitPrice) || 0).toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </td>
                    <td className="text-right">
                      {(Number(item.subtotal) || 0).toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="print-footer-info">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  borderTop: '1px solid #ddd',
                  paddingTop: '15px',
                  marginBottom: '40px',
                }}
              >
                <div style={{ marginBottom: '30px' }}>
                  {/* Si ya está entregado, confirmamos el estado visualmente */}
                  {orderToPrint.status === 'DELIVERED' && (
                    <div
                      style={{
                        color: '#2e7d32',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        border: '2px solid #2e7d32',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        display: 'inline-block',
                      }}
                    >
                      ✓ VEHÍCULO ENTREGADO CON CONFORMIDAD
                    </div>
                  )}
                </div>
                <div
                  className="print-totals"
                  style={{ borderTop: 'none', paddingTop: 0, marginBottom: 0 }}
                >
                  <div className="total-row">
                    <span>BASE IMPONIBLE:</span>
                    <strong>
                      {printEditTotal.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </strong>
                  </div>
                  <div className="total-row">
                    <span>IVA (21%):</span>
                    <strong>
                      {(printEditTotal * 0.21).toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </strong>
                  </div>
                  <div className="total-row main-total">
                    <span>TOTAL:</span>
                    <strong>
                      {(printEditTotal * 1.21).toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="print-legal-container" style={{ marginTop: '30px' }}>
                {/* Mostramos la firma solo si está pendiente de entrega */}
                {orderToPrint.status === 'COMPLETED' && (
                  <div className="print-signature-area" style={{ marginBottom: '15px' }}>
                    <p style={{ marginBottom: '25px', fontSize: '0.9rem' }}>
                      <strong>FIRMA DE RECEPCIÓN (RECIBÍ Y CONFORME):</strong>
                    </p>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px' }}>
                      <div
                        className="signature-line"
                        style={{ borderBottom: '1px solid #000', width: '300px' }}
                      ></div>
                      <p
                        style={{
                          fontSize: '0.7rem',
                          color: '#666',
                          maxWidth: '350px',
                          marginBottom: '2px',
                        }}
                      >
                        (La aceptación vía email o mensajería también implica conformidad
                        con los trabajos realizados)
                      </p>
                    </div>
                  </div>
                )}

                <div className="print-legal-text">
                  <p style={{ fontSize: '0.8rem' }}>
                    <strong>CONFORMIDAD DE ENTREGA:</strong> El cliente manifiesta su
                    conformidad con los trabajos realizados y recibe el vehículo a su
                    entera satisfacción, dándose por finalizada la prestación del servicio
                    y la responsabilidad de custodia por parte del taller.
                  </p>
                  <p style={{ fontSize: '0.8rem', marginTop: '5px', color: '#666' }}>
                    <strong>PROTECCIÓN DE DATOS:</strong> Sus datos son tratados por{' '}
                    {user?.companyName} conforme al RGPD para la gestión del servicio.
                    Puede ejercer sus derechos de acceso o supresión contactando con el
                    taller.
                  </p>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </PageShell>
  );
};

export default WorkOrders;
