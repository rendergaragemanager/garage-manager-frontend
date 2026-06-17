import { Car, ClipboardList, Users, Wrench } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

import DashboardTable from '../../../components/DashboardTable/DashboardTable';
import StatsCard from '../../../components/StatsCard/StatsCard';
import { useUserData } from '../../../context/UserContext/UserContext';
import { getClients } from '../../../services/api/clients.api';
import { getMechanics } from '../../../services/api/users.api';
import { getVehicles } from '../../../services/api/vehicles.api';
import { getWorkOrders } from '../../../services/api/workOrders.api';
import type { Client } from '../../../types/client.types';
import type { User } from '../../../types/user.types';
import type { Vehicle } from '../../../types/vehicle.types';
import type { WorkOrder } from '../../../types/workOrder.types';

import '../Dashboard.css';

const AdministrativeDashboard: React.FC = () => {
  const { user } = useUserData();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 480);
  const [isTouch, setIsTouch] = useState(window.innerWidth <= 1024);

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 480);
      setIsTouch(window.innerWidth <= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [allWorkOrders, allClients, allVehicles, allMechanics] = await Promise.all([
          fetchAllWorkOrders(),
          fetchAllClients(),
          fetchAllVehicles(),
          fetchAllMechanics(),
        ]);

        setWorkOrders(allWorkOrders);
        setClients(allClients);
        setVehicles(allVehicles);
        setMechanics(allMechanics);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeMechanicsCount = mechanics.filter((m) => m.active).length;

  const pendingWorkOrdersCount = workOrders.filter(
    (workOrder) => workOrder.status === 'PENDING' || workOrder.status === 'ASSIGNED',
  ).length;

  const workOrderStatusData = [
    {
      name: 'Pendientes',
      value: pendingWorkOrdersCount,
    },
    {
      name: 'En progreso',
      value: workOrders.filter((w) => w.status === 'IN_PROGRESS').length,
    },
    {
      name: 'Completadas',
      value: workOrders.filter((w) => w.status === 'COMPLETED').length,
    },
    {
      name: 'Canceladas',
      value: workOrders.filter((w) => w.status === 'CANCELLED').length,
    },
    {
      name: 'Entregadas',
      value: workOrders.filter((w) => w.status === 'DELIVERED').length,
    },
  ].filter((item) => item.value > 0);

  const chartColors = ['#0F766E', '#0891B2', '#2563EB', '#16A34A', '#EA580C', '#DC2626'];

  const latestWorkOrders = [...workOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const latestClients = [...clients]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const latestVehicles = [...vehicles]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const formatDate = (date?: string) =>
    date
      ? new Date(date).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '-';

  const getVehicleClientName = (vehicle: Vehicle) => {
    if (typeof vehicle.client === 'object') {
      return vehicle.client.name;
    }
    const client = clients.find((c) => c._id === vehicle.client);
    return client?.name || '-';
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="admin-dashboard-container">
      <h1 className="admin-dashboard-title">
        {user?.name ? `Hola, ${user.name.split(' ')[0]}` : 'Hola'}
      </h1>

      {/* Stats Cards */}
      <div className="admin-dashboard-stats">
        <StatsCard
          label="Albaranes"
          value={workOrders.length}
          icon={ClipboardList}
          color="blue"
        />
        <StatsCard label="Clientes" value={clients.length} icon={Users} color="green" />
        <StatsCard label="Vehículos" value={vehicles.length} icon={Car} color="purple" />
        <StatsCard
          label="Mecánicos activos"
          value={activeMechanicsCount}
          icon={Wrench}
          color="orange"
        />
      </div>

      {/* Fila 1: gráfico y tabla */}
      <div className="admin-dashboard-row">
        <div className="chart-container">
          <h2 className="dashboard-table-title">Estado de órdenes de trabajo</h2>
          {workOrderStatusData.length === 0 ? (
            <p className="dashboard-table-empty">No hay datos de órdenes para mostrar.</p>
          ) : (
            <div className="dashboard-chart-wrapper">
              <div className="dashboard-chart-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workOrderStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 70 : 90}
                      innerRadius={isMobile ? 42 : 55}
                      paddingAngle={3}
                    >
                      {workOrderStatusData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      trigger={isTouch ? 'click' : 'hover'}
                      allowEscapeViewBox={{ x: false, y: false }}
                      wrapperStyle={{ zIndex: 10 }}
                    />
                    <Legend
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                      wrapperStyle={{ marginTop: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
        <div className="dashboard-table-wrapper">
          <DashboardTable
            title="Últimas órdenes de trabajo"
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
                  {order.vehicle
                    ? `${order.vehicle.brand} ${order.vehicle.model} (${order.vehicle.plate})`
                    : '-'}
                </td>
                <td>
                  {(() => {
                    const labels: Record<WorkOrder['status'], string> = {
                      PENDING: 'Pendiente',
                      ASSIGNED: 'Asignada',
                      IN_PROGRESS: 'En progreso',
                      COMPLETED: 'Completada',
                      CANCELLED: 'Cancelada',
                      DELIVERED: 'Entregada',
                    };
                    let colorClass = 'status-badge--neutral';
                    if (order.status === 'COMPLETED' || order.status === 'DELIVERED')
                      colorClass = 'status-badge--success';
                    else if (order.status === 'CANCELLED')
                      colorClass = 'status-badge--danger';
                    else if (
                      order.status === 'IN_PROGRESS' ||
                      order.status === 'ASSIGNED'
                    )
                      colorClass = 'status-badge--info';
                    else if (order.status === 'PENDING')
                      colorClass = 'status-badge--warning';
                    return (
                      <span className={`status-badge ${colorClass}`}>
                        {labels[order.status]}
                      </span>
                    );
                  })()}
                </td>
                <td className="col-hide-md">{formatDate(order.createdAt)}</td>
              </>
            )}
          />
        </div>
      </div>

      {/* Fila 2: dos tablas */}
      <div className="admin-dashboard-row">
        <div className="dashboard-table-wrapper">
          <DashboardTable
            title="Últimos clientes"
            columns={[
              'Nombre',
              'Teléfono',
              { label: 'Email', className: 'col-hide-sm' },
              { label: 'Alta', className: 'col-hide-md' },
            ]}
            data={latestClients}
            rowRenderer={(client: Client) => (
              <>
                <td>{client.name}</td>
                <td>{client.telephone || '-'}</td>
                <td className="col-hide-sm">{client.email || '-'}</td>
                <td className="col-hide-md">{formatDate(client.createdAt)}</td>
              </>
            )}
          />
        </div>
        <div className="dashboard-table-wrapper">
          <DashboardTable
            title="Últimos vehículos"
            columns={[
              'Matrícula',
              'Marca',
              'Modelo',
              { label: 'Cliente', className: 'col-hide-md' },
              { label: 'Alta', className: 'col-hide-md' },
            ]}
            data={latestVehicles}
            rowRenderer={(vehicle: Vehicle) => (
              <>
                <td>{vehicle.plate || '-'}</td>
                <td>{vehicle.brand}</td>
                <td>{vehicle.model}</td>
                <td className="col-hide-md">{getVehicleClientName(vehicle)}</td>
                <td className="col-hide-md">{formatDate(vehicle.createdAt)}</td>
              </>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default AdministrativeDashboard;
