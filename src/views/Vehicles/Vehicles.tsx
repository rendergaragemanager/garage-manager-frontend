import {
  Car,
  Plus,
  User,
  Gauge,
  XCircle,
  Image as ImageIcon,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import FilterStats, {
  type FilterStatsItem,
} from '../../components/FilterStats/FilterStats';
import ConfirmModal from '../../components/modals/ConfirmModal';
import VehicleModal from '../../components/modals/vehicles/VehicleModal';
import WorkOrderModal from '../../components/modals/workorders/WorkOrderModal';
import PageShell from '../../components/PageShell/PageShell';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import SearchBar from '../../components/SearchBar/SearchBar';
import * as clientsApi from '../../services/api/clients.api';
import * as api from '../../services/api/vehicles.api';
import * as workOrdersApi from '../../services/api/workOrders.api';
import type { Client } from '../../types/client.types';
import type { Vehicle } from '../../types/vehicle.types';
import type { WorkOrder } from '../../types/workOrder.types';
import { fetchAllPages } from '../../utils/apiUtils';
import { capitalizeWords, normalizeString } from '../../utils/stringUtils';

import './Vehicles.css';

type VehicleFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const Vehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<VehicleFilter>('ACTIVE');

  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estado para el selector de cliente en el modal (modo standalone)
  const [modalClientSearch, setModalClientSearch] = useState('');

  // Estados para Confirmaciones (Activar/Desactivar)
  type ConfirmAction = {
    type: 'ACTIVATE' | 'DEACTIVATE';
    vehicle: { id: string; plate: string };
  } | null;
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  // Estados para Reparaciones
  const [recentRepairs, setRecentRepairs] = useState<WorkOrder[]>([]);
  const [loadingRepairs, setLoadingRepairs] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);

  // Nueva función: obtener todos los vehículos sin paginación
  const fetchAllVehicles = useCallback(async (): Promise<Vehicle[]> => {
    return fetchAllPages<Vehicle, Record<string, unknown>>(
      api.getVehicles as unknown as (
        params: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>,
      { includeInactive: true, inactive: true },
      'vehicles',
    );
  }, []);

  // Nueva función: obtener todos los clientes sin paginación
  const fetchAllClients = useCallback(async (): Promise<Client[]> => {
    const response = await clientsApi.getClients();
    return response?.clients ?? [];
  }, []);

  // Nueva función: cargar vehículos sin paginación
  const fetchVehicles = useCallback(
    async (silent = false): Promise<void> => {
      try {
        if (silent) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
        const allVehicles = await fetchAllVehicles();
        setVehicles(Array.isArray(allVehicles) ? allVehicles : []);
      } catch (err: unknown) {
        console.error('Error al obtener vehículos:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar los vehículos');
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [fetchAllVehicles],
  );

  // Nueva función: cargar clientes sin paginación
  const fetchClients = useCallback(async () => {
    try {
      const allClients = await fetchAllClients();
      setClients(Array.isArray(allClients) ? allClients : []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  }, [fetchAllClients]);

  useEffect(() => {
    fetchVehicles();
    fetchClients();
  }, [fetchClients, fetchVehicles]);

  const handleOpenModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      // Construir el texto de búsqueda del cliente para el campo del modal
      let clientName = '';
      if (typeof vehicle.client === 'object' && vehicle.client !== null) {
        clientName = `${(vehicle.client as Client).name} (${(vehicle.client as Client).documentNumber})`;
      } else {
        const found = clients.find((c) => c._id === vehicle.client);
        if (found) clientName = `${found.name} (${found.documentNumber})`;
      }
      setModalClientSearch(clientName);
      fetchRecentRepairs(vehicle._id);
    } else {
      setEditingVehicle(null);
      setModalClientSearch('');
      setRecentRepairs([]);
    }
    setIsModalOpen(true);
  };

  const fetchRecentRepairs = async (vehicleId: string) => {
    try {
      setLoadingRepairs(true);
      const res = await workOrdersApi.getWorkOrders({ vehicle: vehicleId, limit: 3 });
      setRecentRepairs(res.workOrders || []);
    } catch (err) {
      console.error('Error fetching recent repairs:', err);
    } finally {
      setLoadingRepairs(false);
    }
  };

  const handleOpenConfirmModal = (
    id: string,
    plate: string,
    type: 'ACTIVATE' | 'DEACTIVATE',
  ) => {
    setConfirmAction({ type, vehicle: { id, plate } });
  };

  const handleCloseConfirmModal = () => {
    setConfirmAction(null);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, vehicle } = confirmAction;
    try {
      setSubmitting(true);
      if (type === 'DEACTIVATE') {
        await api.deactivateVehicle(vehicle.id);
      } else {
        await api.activateVehicle(vehicle.id);
      }
      handleCloseConfirmModal();
      fetchVehicles();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : `Error al ${type === 'ACTIVATE' ? 'activar' : 'desactivar'} el vehículo`;
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
    setModalClientSearch('');
    setRecentRepairs([]);
  };

  const getClientName = React.useCallback(
    (clientRef: string | Client) => {
      if (typeof clientRef === 'object' && clientRef !== null) {
        return (clientRef as Client).name;
      }
      const client = clients.find((c) => c._id === clientRef);
      return client ? client.name : 'Cargando...';
    },
    [clients],
  );

  // 1. Filtro por término de búsqueda (independiente del filtro de estado para las estadísticas)
  const searchFilteredVehicles = useMemo(() => {
    const term = normalizeString(searchTerm).trim();
    if (!term) return vehicles;

    return vehicles.filter((v) => {
      const plate = normalizeString(v.plate);
      const brand = normalizeString(v.brand);
      const model = normalizeString(v.model);
      const clientName = normalizeString(getClientName(v.client));

      return (
        plate.includes(term) ||
        brand.includes(term) ||
        model.includes(term) ||
        clientName.includes(term)
      );
    });
  }, [vehicles, searchTerm, getClientName]);

  // Estadísticas basadas solo en el filtro de búsqueda
  const totalCount = searchFilteredVehicles.length;
  const activeCount = searchFilteredVehicles.filter((v) => v.active).length;
  const inactiveCount = searchFilteredVehicles.filter((v) => !v.active).length;

  // 2. Lógica para filtrar los vehículos en base al estado (para la lista final)
  const filteredVehicles = useMemo(() => {
    if (activeFilter === 'ALL') return searchFilteredVehicles;
    if (activeFilter === 'ACTIVE') return searchFilteredVehicles.filter((v) => v.active);
    if (activeFilter === 'INACTIVE')
      return searchFilteredVehicles.filter((v) => !v.active);

    return searchFilteredVehicles;
  }, [searchFilteredVehicles, activeFilter]);

  const filterLabelByType: Record<VehicleFilter, string> = {
    ALL: 'Total',
    ACTIVE: 'Vehículos activos',
    INACTIVE: 'Vehículos inactivos',
  };

  const statsItems: FilterStatsItem[] = [
    {
      key: 'active',
      label: 'Activos',
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
      isActive: activeFilter === 'INACTIVE',
      onClick: () => setActiveFilter('INACTIVE'),
    },
    {
      key: 'all',
      label: 'Total',
      count: totalCount,
      isActive: activeFilter === 'ALL',
      onClick: () => setActiveFilter('ALL'),
    },
  ];

  return (
    <>
      <PageShell
        className="vehicles-page"
        header={
          <div className="page-shell-header">
            <div className="page-shell-heading">
              <h1 className="page-shell-title">Gestión de Vehículos</h1>

              <div className="page-shell-subtitle-row">
                <p className="page-shell-subtitle">{totalCount} registros totales</p>
                <RefreshButton
                  onRefresh={() => fetchVehicles(true)}
                  isRefreshing={isRefreshing}
                  isLoading={loading}
                  ariaLabel="Actualizar vehículos"
                />
              </div>
            </div>

            <div className="page-shell-actions">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por matrícula, marca, modelo o cliente..."
                ariaLabel="Buscar vehículo por matrícula, marca, modelo o cliente"
              />

              <button
                className="page-shell-create-button"
                onClick={() => handleOpenModal()}
              >
                <Plus size={18} />
                <span>Nuevo Vehículo</span>
              </button>
            </div>
          </div>
        }
        stats={<FilterStats items={statsItems} />}
        filterIndicator={
          <p className="active-filter-indicator">
            Filtro activo: <strong>{filterLabelByType[activeFilter]}</strong>
          </p>
        }
        loading={
          loading ? (
            <section className="vehicles-loading">Cargando vehículos...</section>
          ) : error ? (
            <section className="vehicles-empty">
              <p className="error-text">⚠️ {error}</p>
              <button className="retry-btn" onClick={() => fetchVehicles()}>
                Reintentar
              </button>
            </section>
          ) : undefined
        }
      >
        <div className="vehicles-grid">
          {filteredVehicles.length > 0 ? (
            filteredVehicles.map((vehicle) => (
              <div
                key={vehicle._id}
                className="vehicle-card"
                onClick={() => handleOpenModal(vehicle)}
                style={{ cursor: 'pointer' }}
                title="Clic para editar"
              >
                <div className="vehicle-card-image">
                  {vehicle.image?.url ? (
                    <img
                      src={vehicle.image.url}
                      alt={`${capitalizeWords(vehicle.brand)} ${vehicle.model}`}
                      className="vehicle-img"
                    />
                  ) : (
                    <div className="no-image-placeholder">
                      <ImageIcon size={48} strokeWidth={1} />
                      <span>Sin imagen</span>
                    </div>
                  )}
                  <span
                    className={`status-badge-overlay ${vehicle.active ? 'active' : 'inactive'}`}
                  >
                    {vehicle.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="vehicle-card-body">
                  <div className="plate-container">
                    <span className="plate-badge">{vehicle.plate}</span>
                  </div>

                  <h3 className="vehicle-title">
                    {capitalizeWords(vehicle.brand)} {vehicle.model}
                  </h3>

                  <div className="vehicle-details">
                    <div className="detail-item">
                      <User size={16} />
                      <span>
                        Propietario:{' '}
                        <span className="owner-name">
                          {getClientName(vehicle.client)}
                        </span>
                      </span>
                    </div>
                    <div className="detail-item">
                      <Calendar size={16} />
                      <span>
                        Año: <span className="year-text">{vehicle.year || 'N/A'}</span>
                      </span>
                    </div>
                    <div className="detail-item">
                      <Gauge size={16} />
                      <span>
                        Kilómetros:{' '}
                        <span className="kms-text">
                          {(vehicle.kms || 0)
                            .toString()
                            .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}{' '}
                          km
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="vehicle-card-actions">
                  {vehicle.active ? (
                    <button
                      className="action-btn delete"
                      aria-label="Desactivar"
                      title="Desactivar"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenConfirmModal(vehicle._id, vehicle.plate, 'DEACTIVATE');
                      }}
                    >
                      <XCircle size={18} />
                    </button>
                  ) : (
                    <button
                      className="action-btn activate"
                      aria-label="Reactivar"
                      title="Reactivar"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenConfirmModal(vehicle._id, vehicle.plate, 'ACTIVATE');
                      }}
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <section className="vehicles-empty vehicles-empty--cards">
              <Car size={42} className="vehicles-empty-icon" />
              <p>
                {searchTerm
                  ? `No hay vehículos que coincidan con "${searchTerm}"`
                  : 'Aún no tienes vehículos registrados.'}
              </p>
            </section>
          )}
        </div>
      </PageShell>

      <VehicleModal
        key={editingVehicle?._id ?? 'new'}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaved={() => {
          handleCloseModal();
          fetchVehicles();
        }}
        editingVehicle={editingVehicle}
        clients={clients}
        clientSearch={modalClientSearch}
        onClientSearchChange={(val) => setModalClientSearch(val)}
        recentRepairs={recentRepairs}
        loadingRepairs={loadingRepairs}
        onRepairClick={(id) => setSelectedWorkOrderId(id)}
      />
      <ConfirmModal
        isOpen={!!confirmAction}
        title={
          confirmAction?.type === 'DEACTIVATE'
            ? '¿Desactivar Vehículo?'
            : '¿Reactivar Vehículo?'
        }
        description={
          confirmAction?.type === 'DEACTIVATE'
            ? `El vehículo se trasladará a la lista de vehículos inactivos.`
            : `El vehículo se trasladará a la lista de vehículos activos.`
        }
        confirmText={
          confirmAction?.type === 'DEACTIVATE'
            ? submitting
              ? 'Desactivando...'
              : 'Sí, desactivar'
            : submitting
              ? 'Reactivando...'
              : 'Sí, reactivar'
        }
        cancelText="Cancelar"
        onConfirm={handleConfirmAction}
        onCancel={handleCloseConfirmModal}
        loading={submitting}
        icon={
          confirmAction?.type === 'DEACTIVATE' ? (
            <XCircle size={24} />
          ) : (
            <CheckCircle size={24} />
          )
        }
        iconClassName={confirmAction?.type === 'DEACTIVATE' ? 'deactivate' : 'success'}
        confirmClassName={confirmAction?.type === 'DEACTIVATE' ? 'deactivate' : 'success'}
      />
      <WorkOrderModal
        isOpen={!!selectedWorkOrderId}
        onClose={() => setSelectedWorkOrderId(null)}
        orderId={selectedWorkOrderId}
        onUpdate={() => {
          if (editingVehicle) {
            fetchRecentRepairs(editingVehicle._id);
          }
        }}
      />
    </>
  );
};

export default Vehicles;
