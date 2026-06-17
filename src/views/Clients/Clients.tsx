import { UserPlus, UserCheck, UserX } from 'lucide-react';
import { Mail, Phone, Edit2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DataList,
  type BadgeConfig,
  type ColumnDef,
  type RowAction,
} from '../../components/DataList/DataList';
import FilterStats, {
  type FilterStatsItem,
} from '../../components/FilterStats/FilterStats';
import ClientModal from '../../components/modals/clients/ClientModal';
import ConfirmModal from '../../components/modals/ConfirmModal';
import PageShell from '../../components/PageShell/PageShell';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import SearchBar from '../../components/SearchBar/SearchBar';
import * as api from '../../services/api/clients.api';
import type { Client } from '../../types/client.types';
import { fetchAllPages } from '../../utils/apiUtils';
import { normalizeString, capitalizeWords } from '../../utils/stringUtils';

import './Clients.css';

type ClientFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ClientFilter>('ACTIVE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  type ConfirmAction = {
    type: 'ACTIVATE' | 'DEACTIVATE';
    client: { id: string; name: string };
  } | null;
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAllClients = useCallback(async (): Promise<Client[]> => {
    return fetchAllPages<Client, Record<string, unknown>>(
      api.getClients as unknown as (
        params: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>,
      { includeInactive: true, inactive: true },
      'clients',
    );
  }, []);

  const fetchClients = useCallback(
    async (silent = false): Promise<void> => {
      try {
        if (silent) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const allClients = await fetchAllClients();
        if (Array.isArray(allClients)) {
          setClients(allClients);
        } else {
          console.warn('Unexpected data format from API');
          setClients([]);
        }
      } catch (err: unknown) {
        console.error('Error al obtener clientes:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            'No se pudieron obtener los clientes. Verifica la conexión con el servidor.',
          );
        }
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [fetchAllClients],
  );

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (confirmAction) {
      document.body.style.overflowY = 'hidden';
      document.body.style.overscrollBehaviorY = 'none';
    } else {
      document.body.style.overflowY = '';
      document.body.style.overscrollBehaviorY = '';
    }
    return () => {
      document.body.style.overflowY = '';
      document.body.style.overscrollBehaviorY = '';
    };
  }, [confirmAction]);

  const handleOpenModal = (client?: Client) => {
    setEditingClient(client ?? null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleOpenDeleteModal = (
    id: string,
    name: string,
    type: 'ACTIVATE' | 'DEACTIVATE' = 'DEACTIVATE',
  ) => {
    setConfirmAction({ type, client: { id, name } });
  };

  const handleCloseDeleteModal = () => setConfirmAction(null);

  const handleDeleteConfirm = async () => {
    if (!confirmAction) return;
    const { type, client } = confirmAction;
    try {
      setSubmitting(true);
      if (type === 'DEACTIVATE') {
        await api.deleteClient(client.id);
      } else {
        await api.activateClient(client.id);
      }
      handleCloseDeleteModal();
      void fetchClients();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : `Error al ${type === 'DEACTIVATE' ? 'desactivar' : 'activar'} el cliente`;
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const searchFilteredClients = useMemo(
    () =>
      clients.filter((client) => {
        const term = normalizeString(searchTerm);
        if (!term) return true;
        return (
          normalizeString(client.name).includes(term) ||
          normalizeString(client.email).includes(term) ||
          normalizeString(client.telephone).includes(term)
        );
      }),
    [clients, searchTerm],
  );

  const filteredClients = useMemo(
    () =>
      searchFilteredClients.filter((client) => {
        if (activeFilter === 'ALL') return true;
        if (activeFilter === 'ACTIVE') return client.active;
        if (activeFilter === 'INACTIVE') return !client.active;
        return true;
      }),
    [searchFilteredClients, activeFilter],
  );

  const totalCount = searchFilteredClients.length;
  const activeCount = searchFilteredClients.filter((c) => c.active).length;
  const inactiveCount = searchFilteredClients.filter((c) => !c.active).length;

  const filterLabelByType: Record<ClientFilter, string> = {
    ALL: 'Total',
    ACTIVE: 'Activos',
    INACTIVE: 'Inactivos',
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

  const clientColumns: ColumnDef<Client>[] = [
    {
      key: 'document',
      header: 'DOCUMENTO',
      gridArea: 'document',
      cell: (client) => (
        <span className="client-document-cell">{client.documentNumber || '---'}</span>
      ),
    },
    {
      key: 'client',
      header: 'NOMBRE',
      gridArea: 'clientInfo',
      cell: (client) => (
        <div className="client-main-info">
          <div className="client-name-wrapper">
            <span className="name-text">{capitalizeWords(client.name)}</span>
            {client.clientNumber && (
              <span className="client-number-badge">Nº {client.clientNumber}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'CONTACTO',
      gridArea: 'contact',
      cell: (client) => (
        <div className="workorders-vehicle-client">
          <div className="workorders-client-row">
            <Mail size={16} className="workorders-entity-icon" />
            <span className="workorders-entity-text">{client.email || 'Sin email'}</span>
          </div>
          <div className="workorders-vehicle-row">
            <Phone size={16} className="workorders-entity-icon" />
            <span className="workorders-entity-text">
              {client.telephone || 'Sin teléfono'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'ESTADO',
      gridArea: 'status',
      cell: (client): BadgeConfig => ({
        label: client.active ? 'Activo' : 'Inactivo',
        variant: 'default',
        className: client.active
          ? 'clients-dl-badge--active'
          : 'clients-dl-badge--inactive',
      }),
    },
  ];

  const clientActions: RowAction<Client>[] = [
    {
      key: 'edit',
      icon: <Edit2 size={16} />,
      label: 'Editar',
      onClick: (client: Client) => handleOpenModal(client),
      show: (client: Client) => client.active,
    },
    {
      key: 'deactivate',
      icon: <UserX size={16} />,
      label: 'Desactivar',
      onClick: (client: Client) =>
        handleOpenDeleteModal(client._id, client.name, 'DEACTIVATE'),
      show: (client: Client) => client.active,
    },
    {
      key: 'activate',
      icon: <UserCheck size={16} />,
      label: 'Activar',
      onClick: (client: Client) =>
        handleOpenDeleteModal(client._id, client.name, 'ACTIVATE'),
      show: (client: Client) => !client.active,
    },
  ];

  return (
    <>
      <PageShell
        className="clients-page"
        header={
          <div className="page-shell-header">
            <div className="page-shell-heading">
              <h1 className="page-shell-title">Gestión de Clientes</h1>
              <div className="page-shell-subtitle-row">
                <p className="page-shell-subtitle">{totalCount} registros totales</p>
                <RefreshButton
                  onRefresh={() => void fetchClients(true)}
                  isRefreshing={isRefreshing}
                  isLoading={loading}
                  ariaLabel="Actualizar clientes"
                />
              </div>
            </div>
            <div className="page-shell-actions">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por nombre, email o teléfono..."
                ariaLabel="Buscar cliente por nombre, email o teléfono"
              />
              <button
                type="button"
                className="page-shell-create-button"
                onClick={() => handleOpenModal()}
              >
                <UserPlus size={16} />
                <span>Nuevo Cliente</span>
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
          loading && clients.length === 0 ? (
            <section className="clients-loading">Cargando clientes...</section>
          ) : error ? (
            <section className="clients-empty">
              <p className="error-text">⚠️ {error}</p>
              <button
                type="button"
                className="retry-btn"
                onClick={() => void fetchClients()}
              >
                Reintentar
              </button>
            </section>
          ) : undefined
        }
      >
        <section className="clients-datalist">
          <DataList
            columns={clientColumns}
            data={filteredClients}
            rowKey={(client) => client._id}
            variant="dark"
            actions={clientActions}
            alignActionsTop
            gridTemplateAreas={{
              base: `
                "document clientInfo"
                "contact contact"
                "status actions"
              `,
              tablet: `
                "document clientInfo status"
                "contact contact actions"
              `,
              desktop: `"document clientInfo contact status actions"`,
            }}
            gridTemplateColumns="130px minmax(220px, 1.5fr) minmax(200px, 1.2fr) 120px 100px"
            emptyMessage={
              searchTerm
                ? `No hay clientes que coincidan con "${searchTerm}"`
                : 'Aún no tienes clientes registrados.'
            }
            onRowClick={handleOpenModal}
            rowClassName={(client) => (!client.active ? 'dl-row--inactive' : '')}
          />
        </section>
      </PageShell>

      <ClientModal
        isOpen={isModalOpen}
        editingClient={editingClient}
        onClose={handleCloseModal}
        onSaved={() => void fetchClients()}
        onCreate={(data) => api.createClient(data)}
        onUpdate={(id, data) => api.updateClient(id, data)}
      />

      <ConfirmModal
        isOpen={!!confirmAction}
        title={
          confirmAction?.type === 'DEACTIVATE'
            ? '¿Desactivar Cliente?'
            : '¿Reactivar Cliente?'
        }
        description={
          confirmAction
            ? confirmAction.type === 'DEACTIVATE'
              ? `"${confirmAction.client.name}" pasará al listado de clientes inactivos.`
              : `"${confirmAction.client.name}" volverá a estar disponible en el listado de clientes activos.`
            : ''
        }
        confirmText={
          confirmAction?.type === 'DEACTIVATE'
            ? submitting
              ? 'Desactivando...'
              : 'Sí, Desactivar'
            : submitting
              ? 'Activando...'
              : 'Sí, Reactivar'
        }
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={handleCloseDeleteModal}
        loading={submitting}
        icon={
          confirmAction?.type === 'DEACTIVATE' ? (
            <UserX size={24} />
          ) : (
            <UserCheck size={24} />
          )
        }
        iconClassName={confirmAction?.type === 'DEACTIVATE' ? 'deactivate' : 'success'}
        confirmClassName={confirmAction?.type === 'DEACTIVATE' ? 'deactivate' : 'success'}
      />
    </>
  );
};

export default Clients;
