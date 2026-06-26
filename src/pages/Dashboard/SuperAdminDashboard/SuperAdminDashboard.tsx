import {
  Users,
  CheckCircle,
  TrendingUp,
  Activity,
  BarChart3,
} from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import DashboardTable from '../../../components/DashboardTable/DashboardTable';
import StatsCard from '../../../components/StatsCard/StatsCard';
import { useUserData } from '../../../context/UserContext/UserContext';
import * as companiesApi from '../../../services/api/companies.api';
import type { Company } from '../../../services/api/companies.api';
import * as usersApi from '../../../services/api/users.api';
import type { User } from '../../../types/user.types';
import { resolveCompanyId } from '../../../types/user.types';
import { fetchAllPages } from '../../../utils/apiUtils';

import '../Dashboard.css';
import './SuperAdminDashboard.css';

const COLORS = ['#10B981', '#EF4444', '#f97316', '#3B82F6'];

type PlatformRow = {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
};

const SuperAdminDashboard: React.FC = () => {
  const { user } = useUserData();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carga de empresas (paginada)
        const pageSize = 100;
        let page = 1;
        let totalPages = 1;
        const fetchedCompanies: Company[] = [];

        do {
          const response = await companiesApi.getCompanies({
            includeInactive: true,
            page,
            limit: pageSize,
          });
          fetchedCompanies.push(...(response?.companies ?? []));
          totalPages = response?.pagination?.totalPages ?? 1;
          page += 1;
        } while (page <= totalPages);

        setCompanies(fetchedCompanies);

        // Todos los usuarios de la plataforma
        const fetchedUsers = await fetchAllPages<User, Record<string, unknown>>(
          usersApi.getUsers as unknown as (
            params: Record<string, unknown>,
          ) => Promise<Record<string, unknown>>,
          { includeInactive: true },
          'users',
        );
        setAllUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
      } catch (error) {
        console.error('Error fetching superadmin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const metrics = useMemo(() => {
    const activeCompanies = companies.filter((c) => c.active).length;
    const inactiveCompanies = companies.length - activeCompanies;

    const now = new Date();
    const growthData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthStr = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      const count = companies.filter((c) => {
        if (!c.createdAt) return false;
        const created = new Date(c.createdAt);
        return (
          created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear()
        );
      }).length;
      return { month: monthStr, registros: count };
    });

    const distributionData = [
      { name: 'Activas', value: activeCompanies },
      { name: 'Inactivas', value: inactiveCompanies },
    ];

    const latestCompanies = [...companies]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      )
      .slice(0, 5);

    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter((u) => u.active).length;
    const inactiveUsers = totalUsers - activeUsers;

    const usersPerCompany = companies.map((c) => ({
      name: c.name,
      count: allUsers.filter((u) => resolveCompanyId(u.companyId) === c._id).length,
    }));

    const avgUsersPerCompany =
      companies.length > 0 ? (totalUsers / companies.length).toFixed(1) : '0';

    const topCompany = usersPerCompany.reduce(
      (best, c) => (c.count > best.count ? c : best),
      { name: '---', count: 0 },
    );

    const companiesWithoutUsers = usersPerCompany.filter((c) => c.count === 0).length;

    return {
      totalCompanies: companies.length,
      activeCompanies,
      inactiveCompanies,
      totalUsers,
      activeUsers,
      inactiveUsers,
      avgUsersPerCompany,
      topCompany,
      companiesWithoutUsers,
      growthData,
      distributionData,
      latestCompanies,
    };
  }, [companies, allUsers]);

  if (loading) {
    return (
      <div className="super-admin-dashboard-container">
        <h1 className="super-admin-dashboard-title">Cargando estadísticas...</h1>
      </div>
    );
  }

  const platformSummary: PlatformRow[] = [
    {
      label: 'Usuarios activos en red',
      value: metrics.activeUsers,
      icon: <Users size={16} />,
    },
    {
      label: 'Usuarios inactivos en red',
      value: metrics.inactiveUsers,
      icon: <Users size={16} />,
    },
    {
      label: 'Promedio usuarios / empresa',
      value: metrics.avgUsersPerCompany,
      icon: <BarChart3 size={16} />,
    },
    {
      label: 'Empresa con más usuarios',
      value: `${metrics.topCompany.name} (${metrics.topCompany.count})`,
      icon: <TrendingUp size={16} />,
    },
    {
      label: 'Tasa de actividad empresas',
      value:
        metrics.totalCompanies > 0
          ? `${((metrics.activeCompanies / metrics.totalCompanies) * 100).toFixed(1)}%`
          : '0%',
      icon: <Activity size={16} />,
    },
  ];

  return (
    <div className="super-admin-dashboard-container">
      <h1 className="super-admin-dashboard-title">
        {user?.name ? `Panel de Control: ${user.name.split(' ')[0]}` : 'Panel de Control'}
      </h1>

      <div className="super-admin-dashboard-stats">
        <StatsCard
          label="Empresas Activas"
          value={metrics.activeCompanies}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          label="Empresas Inactivas"
          value={metrics.inactiveCompanies}
          icon={TrendingUp}
          color="purple"
        />
        <StatsCard
          label="Usuarios Activos"
          value={metrics.activeUsers}
          icon={Activity}
          color="blue"
        />
        <StatsCard
          label="Usuarios Inactivos"
          value={metrics.inactiveUsers}
          icon={Users}
          color="orange"
        />
      </div>

      <div className="super-admin-dashboard-row">
        <div className="chart-container">
          <h2 className="dashboard-table-title">Crecimiento de Empresas (6 meses)</h2>
          <div className="dashboard-chart-wrapper">
            <div className="dashboard-chart-inner">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={metrics.growthData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRegistros" x1="0" y1="0" x2="0" y2="1">
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
                      border: '1px solid rgba(249, 115, 22, 0.25)',
                      borderRadius: '12px',
                      color: '#f9fafb',
                      padding: '12px 16px',
                    }}
                    itemStyle={{ color: '#f97316', fontWeight: 700, fontSize: '15px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="registros"
                    stroke="#f97316"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRegistros)"
                    name="Nuevas Empresas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="chart-container">
          <h2 className="dashboard-table-title">Estado de Empresas</h2>
          <div className="dashboard-chart-wrapper">
            <div className="dashboard-chart-inner">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {metrics.distributionData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(13, 18, 23, 0.95)',
                      border: '1px solid rgba(249, 115, 22, 0.25)',
                      borderRadius: '12px',
                      color: '#f9fafb',
                      padding: '12px 16px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="super-admin-dashboard-row">
        <DashboardTable
          title="Resumen de Plataforma"
          columns={[]}
          data={platformSummary}
          rowRenderer={(item: PlatformRow) => (
            <>
              <td>
                <div className="dashboard-cell-flex">
                  <span className="dashboard-icon">{item.icon}</span>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>{item.label}</span>
                </div>
              </td>
              <td className="metric-value">{item.value}</td>
            </>
          )}
        />
        <DashboardTable
          title="Últimas Empresas Registradas"
          columns={[
            'Empresa',
            { label: 'Documento', className: 'col-hide-sm' },
            'Estado',
            { label: 'Fecha', className: 'col-hide-md' },
          ]}
          data={metrics.latestCompanies}
          rowRenderer={(company: Company) => (
            <>
              <td>{company.name}</td>
              <td className="col-hide-sm">{company.document || '---'}</td>
              <td>
                <span
                  className={`status-badge ${company.active ? 'status-badge--success' : 'status-badge--danger'}`}
                >
                  {company.active ? 'Activa' : 'Inactiva'}
                </span>
              </td>
              <td className="col-hide-md">
                {company.createdAt
                  ? new Date(company.createdAt).toLocaleDateString('es-ES')
                  : '---'}
              </td>
            </>
          )}
        />
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
