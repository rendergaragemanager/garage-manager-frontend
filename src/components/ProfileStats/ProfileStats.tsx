import {
  CheckCircle2,
  Wrench,
  Activity,
  ClipboardList,
  CircleDollarSign,
  Clock3,
} from 'lucide-react';

import type { UserRole } from '../../context/UserContext/types';
import type { WorkOrder } from '../../types/workOrder.types';

import './ProfileStats.css';

type ProfileStatsProps = {
  role?: UserRole;
  orders: WorkOrder[];
  loading?: boolean;
};

type StatCard = {
  key: string;
  label: string;
  value: string | number;
  variant: 'completed' | 'active' | 'percentage' | 'total';
};

const statIconByKey = {
  'm-completed': CheckCircle2,
  'm-active': Wrench,
  'm-total': ClipboardList,
  'm-rate': Activity,

  'a-total-month': ClipboardList,
  'a-closed-month': CheckCircle2,
  'a-rate-month': Activity,
  'a-revenue-month': CircleDollarSign,

  'ad-total-month': ClipboardList,
  'ad-open': Clock3,
  'ad-rate': Activity,
} as const;

const ProfileStats = ({ role, orders, loading = false }: ProfileStatsProps) => {
  // para el mecánico:
  const totalAssigned =
    orders.length - orders.filter((order) => order.status === 'CANCELLED').length;
  const completedOrders = orders.filter(
    (order) => order.status === 'COMPLETED' || order.status === 'DELIVERED',
  ).length;
  const activeOrders = orders.filter(
    (order) => order.status === 'ASSIGNED' || order.status === 'IN_PROGRESS',
  ).length;
  const completionPercentage =
    totalAssigned > 0 ? Math.round((completedOrders / totalAssigned) * 100) : 0;

  //placeholders para otros roles
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const isClosedStatus = (status: WorkOrder['status']) =>
    status === 'COMPLETED' || status === 'DELIVERED';

  const isOpenStatus = (status: WorkOrder['status']) =>
    status === 'PENDING' || status === 'ASSIGNED' || status === 'IN_PROGRESS';

  const isCurrentMonth = (isoDate?: string) => {
    if (!isoDate) return false;
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return false;
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  };

  const ordersThisMonth = orders.filter((order) => isCurrentMonth(order.createdAt));
  const totalOrdersMonth = ordersThisMonth.length;

  const closedOrdersMonth = orders.filter(
    (order) => isClosedStatus(order.status) && isCurrentMonth(order.deliveryDate),
  ).length;

  const openOrders = orders.filter((order) => isOpenStatus(order.status)).length;

  const monthlyCloseRate =
    totalOrdersMonth > 0 ? Math.round((closedOrdersMonth / totalOrdersMonth) * 100) : 0;

  const globalCloseRate =
    totalAssigned > 0 ? Math.round((completedOrders / totalAssigned) * 100) : 0;

  const avgTicketSource = ordersThisMonth.length > 0 ? ordersThisMonth : orders;
  const avgTicket =
    avgTicketSource.length > 0
      ? avgTicketSource.reduce((acc, order) => acc + Number(order.total || 0), 0) /
        avgTicketSource.length
      : 0;

  const monthlyRevenue = orders
    .filter(
      (order) =>
        order.status === 'DELIVERED' &&
        !!order.deliveryDate &&
        isCurrentMonth(order.deliveryDate),
    )
    .reduce((acc, order) => acc + Number(order.total || 0), 0);

  const getStatsByRole = (): StatCard[] => {
    switch (role) {
      case 'MECHANIC':
        return [
          {
            key: 'm-completed',
            label: 'Órdenes completadas',
            value: completedOrders,
            variant: 'completed',
          },
          {
            key: 'm-active',
            label: 'Órdenes activas',
            value: activeOrders,
            variant: 'active',
          },
          {
            key: 'm-total',
            label: 'Total órdenes asignadas',
            value: totalAssigned,
            variant: 'total',
          },

          {
            key: 'm-rate',
            label: 'Tasa de completado',
            value: `${completionPercentage}%`,
            variant: 'percentage',
          },
        ];

      case 'ADMINISTRATIVE':
        return [
          {
            key: 'a-total-month',
            label: 'Albaranes del mes',
            value: totalOrdersMonth,
            variant: 'total',
          },
          {
            key: 'a-closed-month',
            label: 'Albaranes finalizados',
            value: closedOrdersMonth,
            variant: 'completed',
          },
          {
            key: 'a-rate-month',
            label: 'Rendimiento mensual',
            value: `${monthlyCloseRate}%`,
            variant: 'percentage',
          },
          {
            key: 'a-revenue-month',
            label: 'Facturado mensual',
            value: `${monthlyRevenue.toFixed(2)} €`,
            variant: 'active',
          },
        ];

      case 'ADMIN':
        return [
          {
            key: 'ad-total-month',
            label: 'Órdenes totales (mes)',
            value: totalOrdersMonth,
            variant: 'total',
          },
          {
            key: 'ad-open',
            label: 'Órdenes abiertas',
            value: openOrders,
            variant: 'active',
          },
          {
            key: 'ad-rate',
            label: 'Tasa global de cierre',
            value: `${globalCloseRate}%`,
            variant: 'percentage',
          },
          {
            key: 'ad-ticket',
            label: 'Ticket medio',
            value: `${avgTicket.toFixed(2)} €`,
            variant: 'completed',
          },
        ];

      default:
        return [
          {
            key: 'd-total',
            label: 'Órdenes totales',
            value: totalAssigned,
            variant: 'total',
          },
          {
            key: 'd-active',
            label: 'Órdenes activas',
            value: activeOrders,
            variant: 'active',
          },
          {
            key: 'd-completed',
            label: 'Órdenes completadas',
            value: completedOrders,
            variant: 'completed',
          },
          {
            key: 'd-rate',
            label: 'Tasa de completado',
            value: `${completionPercentage}%`,
            variant: 'percentage',
          },
        ];
    }
  };

  const stats = getStatsByRole();

  return (
    <section className="profile-stats-card">
      <h2 className="profile-section-title">Mis Estadísticas</h2>

      {loading ? (
        <div className="profile-stats-loading">Cargando estadísticas...</div>
      ) : (
        <div className="profile-stats-grid">
          {stats.map((stat) => {
            const Icon =
              statIconByKey[stat.key as keyof typeof statIconByKey] ?? Activity;

            return (
              <article
                key={stat.key}
                className={`profile-stat-item profile-stat-item--${stat.variant}`}
              >
                <div className="profile-stat-icon-wrap">
                  <Icon size={20} className="profile-stat-icon" />
                </div>

                <div className="profile-stat-text">
                  <p className="profile-stat-label">{stat.label}</p>
                  <span className="profile-stat-value">{stat.value}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ProfileStats;
