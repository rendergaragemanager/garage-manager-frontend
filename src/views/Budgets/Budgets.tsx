import {
  Plus,
  Edit2,
  Eye,
  CheckCircle,
  XCircle,
  User,
  Car,
  Trash,
  Mail,
  Download,
} from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

import {
  DataList,
  type ColumnDef,
  type BadgeVariant,
} from '../../components/DataList/DataList';
import FilterStats, {
  type FilterStatsItem,
} from '../../components/FilterStats/FilterStats';
import BudgetModal from '../../components/modals/budgets/BudgetModal';
import ConfirmModal from '../../components/modals/ConfirmModal';
import PageShell from '../../components/PageShell/PageShell';
import RefreshButton from '../../components/RefreshButton/RefreshButton';
import SearchBar from '../../components/SearchBar/SearchBar';
import { useUserData } from '../../context/UserContext/UserContext';
import * as budgetsApi from '../../services/api/budgets.api';
import * as clientsApi from '../../services/api/clients.api';
import * as vehiclesApi from '../../services/api/vehicles.api';
import {
  BudgetStatus,
  SERVICE_TYPE_LABELS,
  BUDGET_STATUS_LABELS,
} from '../../types/budget.types';
import type { Budget, BudgetItem, ServiceType } from '../../types/budget.types';
import type { Client } from '../../types/client.types';
import type { Vehicle } from '../../types/vehicle.types';
import { fetchAllPages } from '../../utils/apiUtils';
import { normalizeString } from '../../utils/stringUtils';

import './Budgets.css';

type BudgetFilter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED';

const Budgets: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<BudgetFilter>('ALL');

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    id: string;
    action: 'accept' | 'reject' | 'deactivate';
  } | null>(null);

  const [formData, setFormData] = useState({
    client: '',
    vehicle: '',
    description: '',
    serviceType: 'REPAIR' as ServiceType,
    status: BudgetStatus.PENDING as BudgetStatus,
    items: [] as BudgetItem[],
  });

  const { user } = useUserData();

  const fetchAllBudgets = useCallback(async (): Promise<Budget[]> => {
    return fetchAllPages<Budget, Record<string, unknown>>(
      budgetsApi.getBudgets as unknown as (
        params: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>,
      {},
      'budgets',
    );
  }, []);

  const fetchAllClients = useCallback(async (): Promise<Client[]> => {
    return fetchAllPages<Client, Record<string, unknown>>(
      clientsApi.getClients as unknown as (
        params: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>,
      {},
      'clients',
    );
  }, []);

  const fetchAllVehicles = useCallback(async (): Promise<Vehicle[]> => {
    return fetchAllPages<Vehicle, Record<string, unknown>>(
      vehiclesApi.getVehicles as unknown as (
        params: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>,
      {},
      'vehicles',
    );
  }, []);

  const fetchBudgets = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }
        const allBudgets = await fetchAllBudgets();
        setBudgets(allBudgets);
      } catch (err) {
        setError('Error al cargar los presupuestos');
        console.error(err);
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [fetchAllBudgets],
  );

  const fetchClients = useCallback(async () => {
    try {
      setClients(await fetchAllClients());
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  }, [fetchAllClients]);

  const fetchVehicles = useCallback(async () => {
    try {
      setVehicles(await fetchAllVehicles());
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    }
  }, [fetchAllVehicles]);

  useEffect(() => {
    fetchBudgets();
    fetchClients();
    fetchVehicles();
  }, [fetchBudgets, fetchClients, fetchVehicles]);

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  // open close modal
  const handleOpenModal = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        client: typeof budget.client === 'object' ? budget.client._id : budget.client,
        vehicle: typeof budget.vehicle === 'object' ? budget.vehicle._id : budget.vehicle,
        description: budget.description,
        serviceType: budget.serviceType || 'REPAIR',
        status: budget.status || BudgetStatus.PENDING,
        items: [...budget.items],
      });
    } else {
      setEditingBudget(null);
      setFormData({
        client: '',
        vehicle: '',
        description: '',
        serviceType: 'REPAIR',
        status: BudgetStatus.PENDING,
        items: [{ description: '', quantity: 1, unitPrice: 0 }],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
  };

  // form handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'description' && value.length > 0) {
      processedValue = value.charAt(0).toUpperCase() + value.slice(1);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
      ...(name === 'client' ? { vehicle: '' } : {}),
    }));
  };

  const handleItemChange = (
    index: number,
    field: keyof BudgetItem,
    value: string | number,
  ) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      let processedValue = value;
      if (field === 'description' && typeof value === 'string' && value.length > 0) {
        processedValue = value.charAt(0).toUpperCase() + value.slice(1);
      }
      newItems[index] = { ...newItems[index], [field]: processedValue };
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateSubtotal = (item: BudgetItem) =>
    (item.quantity || 0) * (item.unitPrice || 0);

  const totalAmount = useMemo(
    () => formData.items.reduce((acc, item) => acc + calculateSubtotal(item), 0),
    [formData.items],
  );

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client || !formData.vehicle || formData.items.length === 0) {
      alert(
        'Por favor, completa todos los campos requeridos y añade al menos un concepto.',
      );
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        client: formData.client,
        vehicle: formData.vehicle,
        description: formData.description,
        serviceType: formData.serviceType,
        items: formData.items,
      };
      if (editingBudget) {
        await budgetsApi.updateBudget(editingBudget._id, payload);
        if (formData.status !== editingBudget.status) {
          if (formData.status === BudgetStatus.ACCEPTED)
            await budgetsApi.acceptBudget(editingBudget._id);
          else if (formData.status === BudgetStatus.REJECTED)
            await budgetsApi.rejectBudget(editingBudget._id);
        }
      } else {
        await budgetsApi.createBudget({ ...payload, status: formData.status });
      }
      handleCloseModal();
      fetchBudgets();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar el presupuesto');
    } finally {
      setSubmitting(false);
    }
  };

  // cambios de estado (aceptar/rechazar/desactivar)
  const handleStatusUpdate = (id: string, action: 'accept' | 'reject' | 'deactivate') => {
    setConfirmConfig({ id, action });
    setIsConfirmModalOpen(true);
  };

  const executeStatusUpdate = async () => {
    if (!confirmConfig) return;
    const { id, action } = confirmConfig;
    try {
      setSubmitting(true);
      if (action === 'accept') await budgetsApi.acceptBudget(id);
      else if (action === 'reject') await budgetsApi.rejectBudget(id);
      else if (action === 'deactivate') await budgetsApi.deactivateBudget(id);
      fetchBudgets();
      handleCloseModal();
      setIsConfirmModalOpen(false);
      setConfirmConfig(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al actualizar el estado');
    } finally {
      setSubmitting(false);
    }
  };

  // impresion
  const handlePrint = () => window.print();

  // email — acepta presupuesto directo (desde DataList) o usa formData (desde modal)
  const handleSendEmail = (budget?: Budget) => {
    const targetItems = budget ? budget.items : formData.items;
    const targetDescription = budget ? budget.description : formData.description;
    const targetTotal = budget ? budget.total : totalAmount;

    const clientId = budget
      ? typeof budget.client === 'object'
        ? budget.client._id
        : budget.client
      : formData.client;
    const vehicleId = budget
      ? typeof budget.vehicle === 'object'
        ? budget.vehicle._id
        : budget.vehicle
      : formData.vehicle;

    const client = clients.find((c) => c._id === clientId);
    const vehicle = vehicles.find((v) => v._id === vehicleId);
    const clientName = client?.name || 'Cliente';
    const clientEmail = client?.email || '';

    let displayNum = '';
    if (budget) {
      displayNum = budget.budgetNumber || '';
    } else {
      displayNum = budgetDisplayNumber || '';
    }

    const subject = `Presupuesto ${displayNum} - ${user?.companyName || 'Mi Taller'}`;
    let body = `Hola ${clientName},\n\n`;
    body += `Adjuntamos los detalles del presupuesto solicitado para su vehículo ${
      vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : ''
    }:\n\n`;
    if (targetDescription) body += `Descripción: ${targetDescription}\n\n`;
    body += `Conceptos:\n`;
    targetItems.forEach((item) => {
      body += `- ${item.description}: ${item.quantity} x ${item.unitPrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} = ${((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}\n`;
    });
    const iva = targetTotal * 0.21;
    body += `\nBase Imponible: ${targetTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}\n`;
    body += `IVA (21%): ${iva.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}\n`;
    body += `TOTAL PRESUPUESTO: ${(targetTotal + iva).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}\n\n`;
    body += `Quedamos a su disposición para cualquier duda.\nSaludos,\n${user?.companyName || 'Mi Taller'}`;

    window.location.href = `mailto:${clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // ── Display helpers ───────────────────────────────────────────────────────

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const getClientName = useCallback(
    (clientRef: string | Client) => {
      if (!clientRef) return 'N/A';
      if (typeof clientRef === 'object') return clientRef.name;
      return clients.find((c) => c._id === clientRef)?.name ?? 'Cargando...';
    },
    [clients],
  );

  const getVehicleName = useCallback(
    (vehicleRef: string | Vehicle) => {
      if (!vehicleRef) return 'N/A';
      if (typeof vehicleRef === 'object')
        return `${vehicleRef.brand} ${vehicleRef.model} (${vehicleRef.plate})`;
      const v = vehicles.find((v) => v._id === vehicleRef);
      return v ? `${v.brand} ${v.model} (${v.plate})` : 'Cargando...';
    },
    [vehicles],
  );

  // ── Derived state ─────────────────────────────────────────────────────────

  const budgetDisplayNumber = editingBudget?.budgetNumber
    ? `#${editingBudget.budgetNumber}`
    : '';

  const isPendingEditableBudget =
    !!editingBudget && editingBudget.status === BudgetStatus.PENDING;
  const isReadOnlyBudget = !!editingBudget && !isPendingEditableBudget;

  const searchMatchedBudgets = useMemo(() => {
    const term = normalizeString(searchTerm);
    if (!term) return budgets;
    return budgets.filter(
      (b) =>
        normalizeString(b.description).includes(term) ||
        normalizeString(getClientName(b.client)).includes(term) ||
        normalizeString(getVehicleName(b.vehicle)).includes(term),
    );
  }, [budgets, searchTerm, getClientName, getVehicleName]);

  const totalCount = searchMatchedBudgets.length;
  const pendingCount = searchMatchedBudgets.filter(
    (b) => b.status === BudgetStatus.PENDING,
  ).length;
  const acceptedCount = searchMatchedBudgets.filter(
    (b) => b.status === BudgetStatus.ACCEPTED,
  ).length;
  const rejectedCount = searchMatchedBudgets.filter(
    (b) => b.status === BudgetStatus.REJECTED,
  ).length;

  const filteredBudgets = useMemo(
    () =>
      activeFilter === 'ALL'
        ? searchMatchedBudgets
        : searchMatchedBudgets.filter((b) => b.status === activeFilter),
    [searchMatchedBudgets, activeFilter],
  );

  // filtros
  const filterLabelByType: Record<BudgetFilter, string> = {
    ALL: 'Total',
    PENDING: 'Pendientes',
    ACCEPTED: 'Aceptados',
    REJECTED: 'Rechazados',
  };

  const emptyStateByFilter: Record<BudgetFilter, string> = {
    ALL: 'No se encontraron presupuestos.',
    PENDING: 'No hay presupuestos pendientes.',
    ACCEPTED: 'No hay presupuestos aceptados.',
    REJECTED: 'No hay presupuestos rechazados.',
  };

  const statsItems: FilterStatsItem[] = [
    {
      key: 'pending',
      label: 'Pendientes',
      count: pendingCount,
      colors: {
        background: '#23170d',
        border: 'rgba(249, 115, 22, 0.45)',
        text: '#fb923c',
        hoverBorder: 'rgba(249, 115, 22, 0.75)',
        activeBorder: '#fb923c',
        activeRing: 'rgba(251, 146, 60, 0.35)',
      },
      isActive: activeFilter === 'PENDING',
      onClick: () => setActiveFilter('PENDING'),
    },
    {
      key: 'accepted',
      label: 'Aceptados',
      count: acceptedCount,
      colors: {
        background: '#0d201a',
        border: 'rgba(16, 185, 129, 0.45)',
        text: '#34d399',
        hoverBorder: 'rgba(16, 185, 129, 0.75)',
        activeBorder: '#34d399',
        activeRing: 'rgba(52, 211, 153, 0.35)',
      },
      isActive: activeFilter === 'ACCEPTED',
      onClick: () => setActiveFilter('ACCEPTED'),
    },
    {
      key: 'rejected',
      label: 'Rechazados',
      count: rejectedCount,
      colors: {
        background: '#20130f',
        border: 'rgba(239, 68, 68, 0.45)',
        text: '#f87171',
        hoverBorder: 'rgba(239, 68, 68, 0.75)',
        activeBorder: '#f87171',
        activeRing: 'rgba(248, 113, 113, 0.35)',
      },
      isActive: activeFilter === 'REJECTED',
      onClick: () => setActiveFilter('REJECTED'),
    },
    {
      key: 'all',
      label: 'Total',
      count: totalCount,
      isActive: activeFilter === 'ALL',
      onClick: () => setActiveFilter('ALL'),
    },
  ];

  // columnas
  const budgetColumns: ColumnDef<Budget>[] = [
    {
      key: 'number',
      header: 'Nº',
      gridArea: 'number',
      cell: (b) => (
        <span className="budget-number">
          {b.budgetNumber ? `#${b.budgetNumber}` : '---'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'FECHA',
      gridArea: 'date',
      cell: (b) => <span className="workorders-date-cell">{formatDate(b.createdAt)}</span>,
    },
    {
      key: 'service',
      header: 'SERVICIO',
      gridArea: 'service',
      cell: (b) => (
        <span
          className={`service-type-badge service-type-badge--${b.serviceType?.toLowerCase() || 'repair'}`}
        >
          {SERVICE_TYPE_LABELS[b.serviceType || 'REPAIR']}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'DESCRIPCIÓN',
      gridArea: 'description',
      cell: (b) => (
        <div className="budget-main-info">
          <div className="budget-text-content">
            <span className="budget-description">{b.description}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'clientVehicle',
      header: 'CLIENTE / VEHÍCULO',
      gridArea: 'clientVehicle',
      cell: (b) => (
        <div className="workorders-vehicle-client">
          <div className="workorders-client-row">
            <User size={16} className="workorders-entity-icon" />
            <span className="workorders-entity-text">{getClientName(b.client)}</span>
          </div>
          <div className="workorders-vehicle-row">
            <Car size={16} className="workorders-entity-icon" />
            <span className="workorders-entity-text">{getVehicleName(b.vehicle)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'TOTAL',
      gridArea: 'total',
      cell: (b) => (
        <span className="total-amount">
          {b.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'ESTADO',
      gridArea: 'status',
      cell: (b) => ({
        label: BUDGET_STATUS_LABELS[b.status],
        variant: b.status.toLowerCase() as BadgeVariant,
      }),
    },
  ];

  // acciones de la DataList
  const budgetActions = [
    {
      key: 'view',
      icon: <Eye size={16} />,
      label: 'Ver',
      onClick: (b: Budget) => handleOpenModal(b),
      show: (b: Budget) =>
        b.status === BudgetStatus.ACCEPTED || b.status === BudgetStatus.REJECTED,
    },
    {
      key: 'edit',
      icon: <Edit2 size={16} />,
      label: 'Editar',
      onClick: (b: Budget) => handleOpenModal(b),
      show: (b: Budget) => b.status === BudgetStatus.PENDING,
    },
    {
      key: 'email',
      icon: <Mail size={16} />,
      label: 'Enviar email',
      onClick: (b: Budget) => handleSendEmail(b),
      show: () => true,
    },
    {
      key: 'print',
      icon: <Download size={16} />,
      label: 'Imprimir',
      onClick: (b: Budget) => {
        // Poblamos formData con los datos del presupuesto para que el portal de impresión los use
        setFormData({
          client: typeof b.client === 'object' ? b.client._id : b.client,
          vehicle: typeof b.vehicle === 'object' ? b.vehicle._id : b.vehicle,
          description: b.description,
          serviceType: b.serviceType || 'REPAIR',
          status: b.status || BudgetStatus.PENDING,
          items: [...b.items],
        });
        setEditingBudget(b);
        // Pequeño timeout para que React actualice el portal antes de imprimir
        setTimeout(() => handlePrint(), 50);
      },
      show: () => true,
    },
  ];

  return (
    <>
      {/* Portal de impresión */}
      {createPortal(
        <div id="printable-budget" className="printable-budget-container">
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
            <div className="print-budget-meta">
              <h2>PRESUPUESTO</h2>
              <div className="meta-row">
                <span>Nº: </span>
                <strong>
                  {budgetDisplayNumber ||
                    `P-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`}
                </strong>
              </div>
              <div className="meta-row">
                <span>Fecha de emisión:</span>
                <strong> {new Date().toLocaleDateString('es-ES')}</strong>
              </div>
              <div className="meta-row">
                <span>Estado:</span>
                <strong> {BUDGET_STATUS_LABELS[formData.status]}</strong>
              </div>
            </div>
          </div>

          <div className="print-details-grid">
            <div className="print-details-section">
              <h3>DATOS DEL CLIENTE</h3>
              <p>
                <strong>Nombre:</strong> {getClientName(formData.client)}
              </p>
              {clients.find((c) => c._id === formData.client)?.documentNumber && (
                <p>
                  <strong>DNI/CIF:</strong>{' '}
                  {clients.find((c) => c._id === formData.client)?.documentNumber}
                </p>
              )}
              {clients.find((c) => c._id === formData.client)?.telephone && (
                <p>
                  <strong>Teléfono:</strong>{' '}
                  {clients.find((c) => c._id === formData.client)?.telephone}
                </p>
              )}
              {clients.find((c) => c._id === formData.client)?.email && (
                <p>
                  <strong>Email:</strong>{' '}
                  {clients.find((c) => c._id === formData.client)?.email}
                </p>
              )}
              {clients.find((c) => c._id === formData.client)?.address && (
                <p>
                  <strong>Dirección:</strong>{' '}
                  {(() => {
                    const c = clients.find((c) => c._id === formData.client);
                    if (!c?.address) return '';
                    return `${c.address.street || ''}, ${c.address.zipCode || ''} ${c.address.city || ''} (${c.address.country || ''})`;
                  })()}
                </p>
              )}
            </div>
            <div className="print-details-section">
              <h3>DATOS DEL VEHÍCULO</h3>
              <p>
                <strong>Vehículo:</strong> {getVehicleName(formData.vehicle)}
              </p>
              <p>
                <strong>Servicio:</strong> {SERVICE_TYPE_LABELS[formData.serviceType]}
              </p>
            </div>
          </div>

          <div className="print-description">
            <h3>DESCRIPCIÓN</h3>
            <p>{formData.description}</p>
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
              {formData.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.description}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">
                    {item.unitPrice.toLocaleString('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </td>
                  <td className="text-right">
                    {calculateSubtotal(item).toLocaleString('es-ES', {
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
                {/* Si ya está aceptado, confirmamos el estado visualmente */}
                {formData.status === 'ACCEPTED' && (
                  <div
                    style={{
                      color: '#2e7d32',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      border: '2px solid #2e7d32',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ✓ PRESUPUESTO ACEPTADO POR EL CLIENTE
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
                    {totalAmount.toLocaleString('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </strong>
                </div>
                <div className="total-row">
                  <span>IVA (21%):</span>
                  <strong>
                    {(totalAmount * 0.21).toLocaleString('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </strong>
                </div>
                <div className="total-row main-total">
                  <span>TOTAL PRESUPUESTO:</span>
                  <strong>
                    {(totalAmount * 1.21).toLocaleString('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </strong>
                </div>
              </div>
            </div>
            <div className="print-legal-container" style={{ marginTop: '15px' }}>
              {/* Solo mostramos la firma si el presupuesto está pendiente de aceptar */}
              {formData.status === 'PENDING' && (
                <div className="print-signature-area" style={{ marginBottom: '15px' }}>
                  <p style={{ marginBottom: '25px', fontSize: '0.9rem' }}>
                    <strong>FIRMA DE ACEPTACIÓN:</strong>
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
                      contractual)
                    </p>
                  </div>
                </div>
              )}

              <div className="print-legal-text">
                <p style={{ fontSize: '0.8rem' }}>
                  <strong>VALIDEZ Y CONDICIONES:</strong> Este presupuesto tiene una
                  validez de <strong>15 días naturales</strong>. Los precios de los
                  recambios pueden variar si tras el desmontaje se detectan averías
                  ocultas no visibles inicialmente, en cuyo caso se informará al cliente
                  para su aprobación. El cliente autoriza la realización de los trabajos y
                  el movimiento del vehículo en vía pública para las pruebas necesarias.
                </p>
                <p style={{ fontSize: '0.8rem', marginTop: '5px', color: '#666' }}>
                  <strong>PROTECCIÓN DE DATOS:</strong> De acuerdo con el RGPD, los datos
                  aquí recogidos serán tratados por {user?.companyName || 'el taller'}{' '}
                  para la gestión comercial. Puede ejercer sus derechos de
                  acceso o supresión contactando con nosotros.
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Página principal */}
      <PageShell
        className="budgets-page"
        header={
          <div className="page-shell-header">
            <div className="page-shell-heading">
              <h1 className="page-shell-title">Gestión de Presupuestos</h1>
              <div className="page-shell-subtitle-row">
                <p className="page-shell-subtitle">{totalCount} registros totales</p>
                <RefreshButton
                  onRefresh={() => fetchBudgets(true)}
                  isRefreshing={isRefreshing}
                  isLoading={loading}
                  ariaLabel="Actualizar presupuestos"
                />
              </div>
            </div>
            <div className="page-shell-actions">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por descripción, cliente o matrícula..."
              />
              <button
                className="page-shell-create-button"
                onClick={() => handleOpenModal()}
              >
                <Plus size={16} />
                Nuevo Presupuesto
              </button>
            </div>
          </div>
        }
        stats={<FilterStats items={statsItems} tabletColumns={2} />}
        filterIndicator={
          <p className="active-filter-indicator">
            Filtro activo: <strong>{filterLabelByType[activeFilter]}</strong>
          </p>
        }
        loading={
          loading ? (
            <section className="budgets-loading">Cargando presupuestos...</section>
          ) : error ? (
            <section className="budgets-empty">
              <p className="error-text">⚠️ {error}</p>
              <button className="retry-btn" onClick={() => fetchBudgets()}>
                Reintentar
              </button>
            </section>
          ) : undefined
        }
      >
        <section className="budgets-datalist">
          <DataList
            columns={budgetColumns}
            data={filteredBudgets}
            rowKey={(b) => b._id}
            actions={budgetActions}
            variant="dark"
            alignActionsTop
            gridTemplateAreas={{
              base: `
                "number date"
                "service total"
                "description description"
                "clientVehicle clientVehicle"
                "status actions"
              `,
              tablet: `
                "number clientVehicle service date total"
                "description description description description description"
                "status status status status actions"
              `,
              desktop: `"number date service description clientVehicle total status actions"`,
            }}
            gridTemplateColumns="100px 110px 150px minmax(240px, 1fr) minmax(180px, 1fr) 120px 120px 140px"
            emptyMessage={emptyStateByFilter[activeFilter]}
            onRowClick={(b) => handleOpenModal(b)}
          />
        </section>
      </PageShell>

      {/* Modal de detalle/edición/creación */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editingBudget={editingBudget}
        budgetDisplayNumber={budgetDisplayNumber}
        formData={formData}
        clients={clients}
        vehicles={vehicles}
        submitting={submitting}
        isReadOnly={isReadOnlyBudget}
        totalAmount={totalAmount}
        onInputChange={handleInputChange}
        onItemChange={handleItemChange}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onSubmit={handleSubmit}
        onPrint={handlePrint}
        onSendEmail={() => handleSendEmail()}
        onStatusUpdate={handleStatusUpdate}
        calculateSubtotal={calculateSubtotal}
      />

      {/* Modal de confirmación (aceptar / rechazar / desactivar) */}
      <ConfirmModal
        isOpen={isConfirmModalOpen && !!confirmConfig}
        title={
          confirmConfig?.action === 'accept'
            ? '¿Aceptar Presupuesto?'
            : confirmConfig?.action === 'reject'
              ? '¿Rechazar Presupuesto?'
              : '¿Eliminar Presupuesto?'
        }
        description={
          confirmConfig?.action === 'accept'
            ? 'Esta acción no se puede deshacer y creará automáticamente una orden de trabajo.'
            : confirmConfig?.action === 'reject'
              ? 'Esta acción no se puede deshacer.'
              : 'Esta acción no se puede deshacer y el presupuesto dejará de ser accesible.'
        }
        confirmText={
          confirmConfig?.action === 'accept'
            ? 'Sí, Aceptar'
            : confirmConfig?.action === 'reject'
              ? 'Sí, Rechazar'
              : 'Sí, Eliminar'
        }
        onConfirm={executeStatusUpdate}
        onCancel={() => {
          setIsConfirmModalOpen(false);
          setConfirmConfig(null);
        }}
        loading={submitting}
        confirmClassName={
          confirmConfig?.action === 'deactivate' ? 'deactivate' : confirmConfig?.action
        }
        icon={
          confirmConfig?.action === 'accept' ? (
            <CheckCircle size={48} />
          ) : confirmConfig?.action === 'reject' ? (
            <XCircle size={48} />
          ) : (
            <Trash size={48} />
          )
        }
        iconClassName={confirmConfig?.action}
      />
    </>
  );
};

export default Budgets;
