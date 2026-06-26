import { Users, Wrench, BarChart3, Euro, Car, FileText } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

import DashboardTable from '../../../components/DashboardTable/DashboardTable';
import StatsCard from '../../../components/StatsCard/StatsCard';
import { useUserData } from '../../../context/UserContext/UserContext';
import { getBudgets } from '../../../services/api/budgets.api';
import { getClients } from '../../../services/api/clients.api';
import { getAdministratives, getMechanics } from '../../../services/api/users.api';
import { getVehicles } from '../../../services/api/vehicles.api';
import { getWorkOrders } from '../../../services/api/workOrders.api';
import type { Budget } from '../../../types/budget.types';
import type { Client } from '../../../types/client.types';
import type { User } from '../../../types/user.types';
import type { Vehicle } from '../../../types/vehicle.types';
import type { WorkOrder } from '../../../types/workOrder.types';

import '../Dashboard.css';

type SummaryRow = {
  metric: string;
  value: number | string;
  icon?: React.ReactNode;
};

type BudgetWithOptionalServiceType = Budget & {
  serviceType?: string;
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  MAINTENANCE: 'Mantenimiento',
  REPAIR: 'Reparacion',
  INSPECTION: 'Inspeccion',
  ITV: 'ITV',
  OTHER: 'Otro',
};

const AdminDashboard: React.FC = () => {
  const { user } = useUserData();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [administratives, setAdministratives] = useState<User[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [acceptedBudgetsCount, setAcceptedBudgetsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAllWorkOrders = async (): Promise<WorkOrder[]> => {
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    const all: WorkOrder[] = [];

    do {
      const res = await getWorkOrders({ page, limit: pageSize });
      all.push(...(res.workOrders || []));
      totalPages = res?.pagination?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);

    const uniqueById = new Map<string, WorkOrder>();
    all.forEach((item) => uniqueById.set(item._id, item));
    return Array.from(uniqueById.values());
  };

  const fetchAllClients = async (): Promise<Client[]> => {
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    const all: Client[] = [];

    do {
      const res = await getClients({ page, limit: pageSize });
      all.push(...(res.clients || []));
      totalPages = res?.pagination?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);

    const uniqueById = new Map<string, Client>();
    all.forEach((item) => uniqueById.set(item._id, item));
    return Array.from(uniqueById.values());
  };

  const fetchAllVehicles = async (): Promise<Vehicle[]> => {
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    const all: Vehicle[] = [];

    do {
      const res = await getVehicles({ page, limit: pageSize });
      all.push(...(res.vehicles || []));
      totalPages = res?.pagination?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);

    const uniqueById = new Map<string, Vehicle>();
    all.forEach((item) => uniqueById.set(item._id, item));
    return Array.from(uniqueById.values());
  };

  const fetchAllMechanics = async (): Promise<User[]> => {
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    const all: User[] = [];

    do {
      const res = await getMechanics({ page, limit: pageSize });
      all.push(...(res.mechanics || []));
      totalPages = res?.pagination?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);

    const uniqueById = new Map<string, User>();
    all.forEach((item) => uniqueById.set(item._id, item));
    return Array.from(uniqueById.values());
  };

  const fetchAllBudgets = async (): Promise<Budget[]> => {
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    const all: Budget[] = [];

    do {
      const res = await getBudgets({ page, limit: pageSize });
      all.push(...(res.budgets || []));
      totalPages = res?.pagination?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);

    const uniqueById = new Map<string, Budget>();
    all.forEach((item) => uniqueById.set(item._id, item));
    return Array.from(uniqueById.values());
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [allWorkOrders, allClients, allVehicles, allMechanics, allBudgets] =
          await Promise.all([
            fetchAllWorkOrders(),
            fetchAllClients(),
            fetchAllVehicles(),
            fetchAllMechanics(),
            fetchAllBudgets(),
          ]);

        setWorkOrders(allWorkOrders);
        setClients(allClients);
        setVehicles(allVehicles);
        setMechanics(allMechanics);
        setBudgets(allBudgets);
        setAcceptedBudgetsCount(
          allBudgets.filter((budget) => budget.status === 'ACCEPTED').length,
        );

        try {
          const administrativesRes = await getAdministratives();
          setAdministratives(administrativesRes.administratives || []);
        } catch {
          setAdministratives([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeMechanicsCount = mechanics.filter((m) => m.active).length;
  const activeAdministrativesCount = administratives.filter((a) => a.active).length;

  const now = new Date();
  const currentYearStart = new Date(now.getFullYear(), 0, 1);
  const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);

  const isDeliveredInRange = (workOrder: WorkOrder, rangeStart: Date, rangeEnd: Date) => {
    if (workOrder.status !== 'DELIVERED' || !workOrder.deliveryDate) {
      return false;
    }
    const deliveredAt = new Date(workOrder.deliveryDate);
    return deliveredAt >= rangeStart && deliveredAt < rangeEnd;
  };

  const getWorkOrderAmount = (workOrder: WorkOrder) => {
    if (typeof workOrder.total === 'number' && !Number.isNaN(workOrder.total)) {
      return workOrder.total;
    }
    return 0;
  };

  const yearlyRevenue = workOrders
    .filter((w) => isDeliveredInRange(w, currentYearStart, nextYearStart))
    .reduce((sum, w) => sum + getWorkOrderAmount(w), 0);

  const totalOrdersCount = workOrders.length;

  const completedOrDeliveredCount = workOrders.filter(
    (w) => w.status === 'COMPLETED' || w.status === 'DELIVERED',
  ).length;

  const totalRevenue = workOrders
    .filter((w) => w.status === 'DELIVERED')
    .reduce((sum, w) => sum + getWorkOrderAmount(w), 0);

  const generalPerformancePercentage =
    totalOrdersCount > 0
      ? Math.round((completedOrDeliveredCount / totalOrdersCount) * 100)
      : 0;

  const formatDate = (date?: string) =>
    date
      ? new Date(date).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '-';

  const renderWorkOrderStatusBadge = (status: WorkOrder['status']) => {
    const labels: Record<WorkOrder['status'], string> = {
      PENDING: 'Pendiente',
      ASSIGNED: 'Asignada',
      IN_PROGRESS: 'En progreso',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      DELIVERED: 'Entregada',
    };

    let colorClass = 'status-badge--neutral';
    if (status === 'COMPLETED' || status === 'DELIVERED')
      colorClass = 'status-badge--success';
    else if (status === 'CANCELLED') colorClass = 'status-badge--danger';
    else if (status === 'IN_PROGRESS' || status === 'ASSIGNED')
      colorClass = 'status-badge--info';
    else if (status === 'PENDING') colorClass = 'status-badge--warning';

    return <span className={`status-badge ${colorClass}`}>{labels[status]}</span>;
  };

  const latestWorkOrders = [...workOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const latestBudgets = [...budgets]
    .sort(
      (a, b) =>
        new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime(),
    )
    .slice(0, 5);

  const renderBudgetStatusBadge = (status: Budget['status']) => {
    const labels: Record<Budget['status'], string> = {
      PENDING: 'Pendiente',
      ACCEPTED: 'Aceptado',
      REJECTED: 'Rechazado',
    };

    let colorClass = 'status-badge--warning';
    if (status === 'ACCEPTED') colorClass = 'status-badge--success';
    if (status === 'REJECTED') colorClass = 'status-badge--danger';

    return <span className={`status-badge ${colorClass}`}>{labels[status]}</span>;
  };

  const getBudgetClientName = (budget: Budget) => {
    if (typeof budget.client === 'object') return budget.client.name;
    const client = clients.find((c) => c._id === budget.client);
    return client?.name || '-';
  };

  const getBudgetServiceLabel = (budget: Budget) => {
    const serviceType = (budget as BudgetWithOptionalServiceType).serviceType;
    if (!serviceType) return '-';
    const normalizedServiceType = serviceType.toUpperCase();
    return SERVICE_TYPE_LABELS[normalizedServiceType] || normalizedServiceType;
  };

  const monthlyRevenueData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthNextStart = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    const revenue = workOrders
      .filter((w) => isDeliveredInRange(w, monthStart, monthNextStart))
      .reduce((sum, w) => sum + getWorkOrderAmount(w), 0);

    return {
      month: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
      ingresos: Math.round(revenue * 100) / 100,
    };
  });

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="admin-dashboard-container">
      <h1 className="admin-dashboard-title">
        {user?.name ? `Hola, ${user.name.split(' ')[0]}` : 'Hola'}
      </h1>

      <div className="admin-dashboard-stats">
        <StatsCard
          label="Mecánicos"
          value={activeMechanicsCount}
          icon={Wrench}
          color="green"
        />
        <StatsCard
          label="Administrativos"
          value={activeAdministrativesCount}
          icon={Users}
          color="blue"
        />
        <StatsCard
          label="Rendimiento general (%)"
          value={generalPerformancePercentage}
          icon={BarChart3}
          color="purple"
        />
        <StatsCard
          label="Total albaranes (año)"
          value={Math.round(yearlyRevenue)}
          icon={Euro}
          color="orange"
        />
      </div>

      <div className="admin-dashboard-row">
        <div className="chart-container">
          <h2 className="dashboard-table-title">Ingresos mensuales</h2>
          {monthlyRevenueData.every((d) => d.ingresos === 0) ? (
            <p className="dashboard-table-empty">
              No hay datos de ingresos para mostrar.
            </p>
          ) : (
            <div
              className="dashboard-chart-wrapper"
              key={monthlyRevenueData.length > 0 ? 'ready' : 'empty'}
            >
              <div className="dashboard-chart-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyRevenueData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(13, 18, 23, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(249, 115, 22, 0.25)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                        color: '#f9fafb',
                        padding: '12px 16px',
                      }}
                      itemStyle={{ color: '#f97316', fontWeight: 700, fontSize: '15px' }}
                      formatter={(value) => {
                        const numericValue =
                          typeof value === 'number' ? value : Number(value) || 0;
                        return [`${numericValue.toFixed(2)} €`, 'Ingresos'];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ingresos"
                      stroke="#f97316"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      isAnimationActive={true}
                      animationDuration={1500}
                      animationEasing="ease-out"
                      activeDot={{
                        r: 6,
                        fill: '#f97316',
                        stroke: '#1f2937',
                        strokeWidth: 3,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
        <DashboardTable
          title="Resumen estadístico"
          columns={[]}
          data={[
            {
              metric: 'Total de clientes',
              value: clients.length,
              icon: <Users size={16} />,
            },
            {
              metric: 'Total de vehículos',
              value: vehicles.length,
              icon: <Car size={16} />,
            },
            {
              metric: 'Presupuestos aceptados',
              value: acceptedBudgetsCount,
              icon: <FileText size={16} />,
            },
            {
              metric: 'Albaranes finalizados',
              value: completedOrDeliveredCount,
              icon: <Wrench size={16} />,
            },
            {
              metric: 'Ingresos totales',
              value: `${totalRevenue.toFixed(2)} €`,
              icon: <Euro size={16} />,
            },
          ]}
          rowRenderer={(item: SummaryRow) => (
            <>
              <td>
                <div className="dashboard-cell-flex">
                  <span className="dashboard-icon">{item.icon}</span>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>{item.metric}</span>
                </div>
              </td>
              <td
                className={
                  item.metric.includes('Ingresos') || item.metric.includes('cerradas')
                    ? 'metric-value-primary'
                    : 'metric-value'
                }
              >
                {item.value}
              </td>
            </>
          )}
        />
      </div>

      <div className="admin-dashboard-row">
        <DashboardTable
          title="Últimas órdenes"
          columns={[
            'Cliente',
            { label: 'Vehículo', className: 'col-hide-sm' },
            'Estado',
            { label: 'Fecha', className: 'col-hide-md' },
          ]}
          data={latestWorkOrders}
          rowRenderer={(order: WorkOrder) => (
            <>
              <td>{order.client?.name || '-'}</td>
              <td className="col-hide-sm">
                {order.vehicle ? (
                  <span>
                    {order.vehicle.brand} {order.vehicle.model}
                  </span>
                ) : (
                  '-'
                )}
              </td>
              <td>{renderWorkOrderStatusBadge(order.status)}</td>
              <td className="col-hide-md dashboard-text-muted">
                {formatDate(order.createdAt)}
              </td>
            </>
          )}
        />
        <DashboardTable
          title="Últimos presupuestos"
          columns={[
            'Cliente',
            { label: 'Servicio', className: 'col-hide-sm' },
            'Estado',
            { label: 'Fecha', className: 'col-hide-md' },
          ]}
          data={latestBudgets}
          rowRenderer={(budget: Budget) => (
            <>
              <td>{getBudgetClientName(budget)}</td>
              <td className="col-hide-sm">{getBudgetServiceLabel(budget)}</td>
              <td>{renderBudgetStatusBadge(budget.status)}</td>
              <td className="col-hide-md dashboard-text-muted">
                {formatDate(budget.createdAt)}
              </td>
            </>
          )}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
