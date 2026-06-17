import {
  Car,
  CheckCircle2,
  PackageCheck,
  Play,
  Plus,
  Save,
  Trash2,
  User,
  UserPlus,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import './WorkOrderModal.css';
import { useUserData } from '../../../context/UserContext/UserContext';
import { getClients } from '../../../services/api/clients.api';
import { getMechanics } from '../../../services/api/users.api';
import { getVehicles } from '../../../services/api/vehicles.api';
import {
  createWorkOrder,
  getWorkOrderById,
  updateWorkOrder,
  updateWorkOrderStatus,
} from '../../../services/api/workOrders.api';
import { SERVICE_TYPE_LABELS, SERVICE_TYPES } from '../../../types/budget.types';
import type { Client } from '../../../types/client.types';
import type { User as UserModel } from '../../../types/user.types';
import type { Vehicle } from '../../../types/vehicle.types';
import type { WorkOrder, WorkOrderServiceType } from '../../../types/workOrder.types';
import ConfirmModal from '../ConfirmModal';

type EditableItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type ConfirmAction =
  | { type: 'complete' }
  | { type: 'deliver' }
  | { type: 'cancel-order' }
  | { type: 'start-order' }
  | { type: 'assign-mechanic' }
  | { type: 'remove-item'; itemIndex: number };

export type WorkOrderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  orderNumber?: string;
  onCreated?: () => void | Promise<void>;
  onUpdate?: () => void | Promise<void>;
};

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const capitalizeFirst = (value: string) => {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const normalizeQty = (value: unknown) => {
  const digits = String(value ?? '').replace(/\D+/g, '');
  if (!digits) return 0;
  const n = Number(digits.replace(/^0+(?=\d)/, ''));
  return Number.isFinite(n) ? n : 0;
};

const normalizeItemLabel = (v: string) =>
  v
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const isLaborItem = (desc: string) => normalizeItemLabel(desc) === 'mano de obra';

const sanitizeItems = (items: EditableItem[]) =>
  items
    .map((item) => ({
      description: capitalizeFirst(item.description.trim()),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: Number((item.quantity * item.unitPrice).toFixed(2)),
    }))
    .filter((item) => item.description.length > 0 && item.quantity > 0);

const toSpanishError = (message: string, fallback: string) => {
  const n = message.trim().toLocaleLowerCase('es-ES');
  if (!n) return fallback;
  if ((n.includes('vehicle') || n.includes('kms')) && n.includes('decrease'))
    return 'El kilometraje del vehículo no puede disminuir';
  if (
    (n.includes('kms') || n.includes('kilomet')) &&
    (n.includes('required') || n.includes('must') || n.includes('valid'))
  )
    return 'Debes introducir un kilometraje válido para iniciar la orden';
  if (n.includes('mechanic') && (n.includes('required') || n.includes('must')))
    return 'Debes seleccionar un mecánico para asignar la orden';
  if (n.includes('can no longer be modified') || n.includes('cannot be modified'))
    return 'Este albarán ya no se puede modificar en su estado actual';
  if (n.includes('not found')) return 'No se encontró el recurso solicitado';
  if (n.includes('forbidden') || n.includes('not authorized'))
    return 'No tienes permisos para realizar esta acción';
  return message;
};

const getErrMsg = (err: unknown, fallback: string) =>
  err instanceof Error ? toSpanishError(err.message, fallback) : fallback;

const NON_EDITABLE_STATUSES: WorkOrder['status'][] = ['DELIVERED', 'CANCELLED'];

const STATUS_LABEL_MGMT: Record<WorkOrder['status'], string> = {
  PENDING: 'Pend. asignación',
  ASSIGNED: 'Asignada',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Pend. entrega',
  CANCELLED: 'Cancelada',
  DELIVERED: 'Finalizada',
};

const EMPTY_ITEM: EditableItem = {
  description: '',
  quantity: 1,
  unitPrice: 0,
  subtotal: 0,
};

async function loadAllClients(): Promise<Client[]> {
  const pageSize = 100;
  let page = 1;
  let totalPages = 1;
  const all: Client[] = [];
  do {
    const res = await getClients({ page, limit: pageSize });
    all.push(...(res.clients ?? []));
    totalPages = res?.pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);
  return Array.from(new Map(all.map((c) => [c._id, c])).values());
}

async function loadAllVehicles(): Promise<Vehicle[]> {
  const pageSize = 100;
  let page = 1;
  let totalPages = 1;
  const all: Vehicle[] = [];
  do {
    const res = await getVehicles({ page, limit: pageSize });
    all.push(...(res.vehicles ?? []));
    totalPages = res?.pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);
  return Array.from(new Map(all.map((v) => [v._id, v])).values());
}

async function loadAllMechanics(): Promise<UserModel[]> {
  const pageSize = 100;
  let page = 1;
  let totalPages = 1;
  const all: UserModel[] = [];
  do {
    const res = await getMechanics({ page, limit: pageSize });
    all.push(...(res.mechanics ?? []));
    totalPages = res?.pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);
  return Array.from(new Map(all.map((m) => [m._id, m])).values()).filter(
    (u) => u.role === 'MECHANIC' && u.active,
  );
}

const getInitialForm = () => ({
  client: '',
  vehicle: '',
  mechanic: '',
  serviceType: 'REPAIR' as WorkOrderServiceType,
  description: '',
  items: [{ ...EMPTY_ITEM }] as EditableItem[],
});

const WorkOrderModal = ({
  isOpen,
  onClose,
  orderId,
  orderNumber: externalOrderNumber,
  onCreated,
  onUpdate,
}: WorkOrderModalProps) => {
  const { user } = useUserData();
  const isCreateMode = orderId === null;
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<UserModel[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [createForm, setCreateForm] = useState(getInitialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startKms, setStartKms] = useState('');
  const [mechanicId, setMechanicId] = useState('');
  const [loadingMechanics, setLoadingMechanics] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const role = user?.role;
  const isMechanic = role === 'MECHANIC';
  const isAdmin = role === 'ADMIN';
  const isManagement = role === 'ADMIN' || role === 'ADMINISTRATIVE';

  const orderMechanicId = order?.mechanic
    ? typeof order.mechanic === 'object'
      ? order.mechanic._id
      : String(order.mechanic)
    : undefined;
  const isAssignedMechanic = isMechanic && orderMechanicId === user?.userId;

  const canAssignMechanic =
    !!order && isManagement && order.status === 'PENDING' && !order.mechanic;
  const canStart =
    !!order && order.status === 'ASSIGNED' && (isAdmin || isAssignedMechanic);
  const canComplete =
    !!order && order.status === 'IN_PROGRESS' && (isAdmin || isAssignedMechanic);
  const canDeliver = !!order && order.status === 'COMPLETED' && isManagement;
  const showDeliverButton =
    !!order &&
    isManagement &&
    (order.status === 'IN_PROGRESS' || order.status === 'COMPLETED');
  const isDeliverDisabled = !!order && isManagement && order.status === 'IN_PROGRESS';
  const canCancel =
    !!order &&
    isManagement &&
    (order.status === 'PENDING' || order.status === 'ASSIGNED');
  const hasStatusActions =
    canAssignMechanic || canStart || canComplete || showDeliverButton || canCancel;

  const canEditItems = order
    ? isMechanic
      ? isAssignedMechanic && order.status === 'IN_PROGRESS'
      : !NON_EDITABLE_STATUSES.includes(order.status)
    : false;
  const showItemEditControls =
    (!isMechanic || order?.status === 'IN_PROGRESS') &&
    !NON_EDITABLE_STATUSES.includes(order?.status ?? 'PENDING');

  const displayOrderNumber = useMemo(() => {
    if (order?.workOrderNumber) {
      return `#${order.workOrderNumber}`;
    }
    if (externalOrderNumber) return externalOrderNumber;
    if (!order) return '';
    const ref = order._id.slice(-6).toUpperCase();
    const year = new Date(order.createdAt).getFullYear();
    return `#${ref}/${year}`;
  }, [externalOrderNumber, order]);

  const editTotal = useMemo(
    () => items.reduce((acc, item) => acc + toSafeNumber(item.subtotal), 0),
    [items],
  );
  const createTotal = useMemo(
    () => createForm.items.reduce((acc, i) => acc + toSafeNumber(i.subtotal), 0),
    [createForm.items],
  );

  const hasChanges = useMemo(() => {
    if (isCreateMode) {
      return (
        createForm.client !== '' &&
        createForm.vehicle !== '' &&
        createForm.description.trim() !== '' &&
        createForm.items.some(
          (item) => item.description.trim() !== '' && item.quantity > 0,
        )
      );
    }

    if (!order) return false;

    // Compare current items with original order items
    const originalItems = order.items || [];
    if (items.length !== originalItems.length) return true;

    return items.some((item, idx) => {
      const original = originalItems[idx];
      return (
        item.description.trim() !== (original?.description || '').trim() ||
        item.quantity !== original?.quantity ||
        item.unitPrice !== original?.unitPrice
      );
    });
  }, [isCreateMode, createForm, order, items]);

  const vehicleKmsLabel =
    typeof order?.vehicle.kms === 'number'
      ? `${Math.trunc(order.vehicle.kms).toLocaleString('es-ES')} km`
      : 'Sin kilometraje';

  const availableVehicles = useMemo(
    () =>
      vehicles.filter((v) => {
        const clientId = typeof v.client === 'object' ? v.client._id : v.client;
        return v.active && clientId === createForm.client;
      }),
    [vehicles, createForm.client],
  );

  const applyOrderData = useCallback((nextOrder: WorkOrder) => {
    setOrder(nextOrder);
    setConfirmAction(null);
    setItems(
      (nextOrder.items ?? []).map((item) => {
        const quantity = normalizeQty(item.quantity);
        const unitPrice = Math.max(0, toSafeNumber(item.unitPrice));
        const subtotal =
          Math.max(0, toSafeNumber(item.subtotal)) ||
          Number((quantity * unitPrice).toFixed(2));
        return {
          description: capitalizeFirst(item.description ?? ''),
          quantity,
          unitPrice,
          subtotal,
        };
      }),
    );
  }, []);

  const refreshOrder = useCallback(async () => {
    if (!orderId) return;
    const fresh = await getWorkOrderById(orderId);
    applyOrderData(fresh);
    await Promise.resolve(onUpdate?.());
  }, [orderId, applyOrderData, onUpdate]);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      applyOrderData(await getWorkOrderById(orderId));
      setStartKms('');
      setMechanicId('');
    } catch (err) {
      setError(getErrMsg(err, 'No se pudo cargar la orden de trabajo'));
    } finally {
      setLoading(false);
    }
  }, [orderId, applyOrderData]);

  const loadCatalogs = useCallback(async () => {
    try {
      setLoadingCatalogs(true);
      setError(null);
      const [c, v, m] = await Promise.allSettled([
        loadAllClients(),
        loadAllVehicles(),
        loadAllMechanics(),
      ]);
      setClients(c.status === 'fulfilled' ? c.value : []);
      setVehicles(v.status === 'fulfilled' ? v.value : []);
      setMechanics(m.status === 'fulfilled' ? m.value : []);
      if (c.status === 'rejected' || v.status === 'rejected')
        setError('No se pudieron cargar clientes o vehículos');
    } catch (err) {
      setError(getErrMsg(err, 'No se pudieron cargar los datos del formulario'));
    } finally {
      setLoadingCatalogs(false);
    }
  }, []);

  const loadMechanicsOnly = useCallback(async () => {
    try {
      setLoadingMechanics(true);
      setMechanics(await loadAllMechanics());
    } catch {
      setMechanics([]);
    } finally {
      setLoadingMechanics(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setConfirmAction(null);
      setError(null);
      document.body.style.overflow = 'unset';
      return;
    }
    document.body.style.overflow = 'hidden';
    if (isCreateMode) {
      setCreateForm(getInitialForm());
      setItems([{ ...EMPTY_ITEM }]);
      void loadCatalogs();
    } else {
      void loadOrder();
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isCreateMode, loadCatalogs, loadOrder]);

  useEffect(() => {
    if (isOpen && canAssignMechanic) void loadMechanicsOnly();
  }, [isOpen, canAssignMechanic, loadMechanicsOnly]);

  const handleCreateInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({
      ...prev,
      [name]: name === 'description' ? capitalizeFirst(value) : value,
      ...(name === 'client' ? { vehicle: '' } : {}),
    }));
  };

  const handleCreateItemChange = (
    index: number,
    field: keyof EditableItem,
    value: string,
  ) => {
    setCreateForm((prev) => {
      const next = [...prev.items];
      if (!next[index]) return prev;
      const item = { ...next[index] };
      if (field === 'quantity') {
        const parsed = Number(value);
        item.quantity = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
      } else if (field === 'unitPrice') {
        const parsed = Number(value);
        item.unitPrice = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      } else {
        item.description = capitalizeFirst(value);
      }
      item.subtotal = Number((item.quantity * item.unitPrice).toFixed(2));
      next[index] = item;
      return { ...prev, items: next };
    });
  };

  const handleAddCreateItem = () =>
    setCreateForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM }],
    }));

  const handleRemoveCreateItem = (index: number) =>
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizeItems(createForm.items);
    if (!createForm.client || !createForm.vehicle || !createForm.description.trim()) {
      setError('Cliente, vehículo y descripción son obligatorios');
      return;
    }
    if (sanitized.length === 0) {
      setError('Debes añadir al menos un ítem válido');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await createWorkOrder({
        client: createForm.client,
        vehicle: createForm.vehicle,
        serviceType: createForm.serviceType,
        description: capitalizeFirst(createForm.description.trim()),
        mechanic: createForm.mechanic || undefined,
        items: sanitized,
      });
      await Promise.resolve(onCreated?.());
      onClose();
    } catch (err) {
      setError(getErrMsg(err, 'No se pudo crear el albarán'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditItemChange = (
    index: number,
    field: 'description' | 'quantity' | 'unitPrice',
    value: string,
  ) => {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      if (isMechanic && field === 'unitPrice') return prev;
      if (isMechanic && field === 'description' && isLaborItem(current.description))
        return prev;
      if (field === 'description') current.description = capitalizeFirst(value);
      if (field === 'quantity') current.quantity = normalizeQty(value);
      if (field === 'unitPrice') {
        const n = Number(value);
        current.unitPrice = Number.isFinite(n) && n >= 0 ? n : 0;
      }
      current.subtotal = Number((current.quantity * current.unitPrice).toFixed(2));
      return next;
    });
  };

  const handleAddEditItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const handleSaveItems = async () => {
    if (!order) return;
    try {
      setSaving(true);
      setError(null);
      await updateWorkOrder(order._id, { items: sanitizeItems(items) });
      await refreshOrder();
    } catch (err) {
      setError(getErrMsg(err, 'No se pudieron guardar los ítems'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (index: number) => {
    if (!order || !canEditItems) return;
    const target = items[index];
    if (isMechanic && target && isLaborItem(target.description)) return;
    try {
      setSaving(true);
      setError(null);
      await updateWorkOrder(order._id, {
        items: sanitizeItems(items.filter((_, i) => i !== index)),
      });
      await refreshOrder();
      setConfirmAction(null);
    } catch (err) {
      setError(getErrMsg(err, 'No se pudo eliminar el ítem'));
    } finally {
      setSaving(false);
    }
  };

  const handleAssignMechanic = async () => {
    if (!order || !mechanicId.trim()) return;
    try {
      setSaving(true);
      setError(null);
      await updateWorkOrderStatus(order._id, {
        status: 'ASSIGNED',
        mechanic: mechanicId.trim(),
      });
      await refreshOrder();
      setMechanicId('');
      setConfirmAction(null);
    } catch (err) {
      setError(getErrMsg(err, 'No se pudo asignar el mecánico'));
    } finally {
      setSaving(false);
    }
  };

  const handleRequestAssign = () => {
    if (!order || !mechanicId.trim()) {
      setError('Debes seleccionar un mecánico para asignar la orden');
      return;
    }
    setError(null);
    setConfirmAction({ type: 'assign-mechanic' });
  };

  const handleStart = async () => {
    if (!order) return;
    const kmsValue = Number(startKms);
    try {
      setSaving(true);
      setError(null);
      await updateWorkOrderStatus(order._id, { status: 'IN_PROGRESS', kms: kmsValue });
      await refreshOrder();
      setConfirmAction(null);
    } catch (err) {
      setError(getErrMsg(err, 'No se pudo iniciar la orden'));
    } finally {
      setSaving(false);
    }
  };

  const handleRequestStart = () => {
    if (!order || saving) return;
    const kmsValue = Number(startKms);
    if (!startKms.trim() || !Number.isFinite(kmsValue) || kmsValue < 0) {
      setError('Debes indicar un kilometraje válido para iniciar la orden');
      return;
    }
    setError(null);
    setConfirmAction({ type: 'start-order' });
  };

  const handleComplete = async () => {
    if (!order) return;
    try {
      setSaving(true);
      setError(null);
      await updateWorkOrderStatus(order._id, { status: 'COMPLETED' });
      await refreshOrder();
      setConfirmAction(null);
    } catch (err) {
      setError(getErrMsg(err, 'No se pudo completar la orden'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeliver = async () => {
    if (!order) return;
    try {
      setSaving(true);
      setError(null);
      await updateWorkOrderStatus(order._id, { status: 'DELIVERED' });
      await refreshOrder();
      setConfirmAction(null);
    } catch (err) {
      setError(getErrMsg(err, 'No se pudo entregar la orden'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    try {
      setSaving(true);
      setError(null);
      await updateWorkOrderStatus(order._id, { status: 'CANCELLED' });
      await refreshOrder();
      setConfirmAction(null);
    } catch (err) {
      setError(getErrMsg(err, 'No se pudo cancelar el albarán'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction || saving) return;
    if (confirmAction.type === 'assign-mechanic') await handleAssignMechanic();
    else if (confirmAction.type === 'start-order') await handleStart();
    else if (confirmAction.type === 'complete') await handleComplete();
    else if (confirmAction.type === 'deliver') await handleDeliver();
    else if (confirmAction.type === 'cancel-order') await handleCancel();
    else if (confirmAction.type === 'remove-item')
      await handleRemoveItem(confirmAction.itemIndex);
  };

  const confirmCopy = useMemo(() => {
    if (!confirmAction) return null;

    if (confirmAction.type === 'assign-mechanic') {
      const selectedMec = mechanics.find((m) => m._id === mechanicId);
      return {
        message: `¿Asignar esta orden a ${selectedMec?.name || 'este mecánico'}?`,
        confirmLabel: 'Confirmar asignación',
        confirmClass: 'warning',
        icon: <UserPlus size={48} />,
        iconClass: 'warning',
      };
    }

    if (confirmAction.type === 'start-order') {
      return {
        message: `¿Iniciar orden con ${startKms} km? Esto cambiará el estado a en proceso.`,
        confirmLabel: 'Iniciar ahora',
        confirmClass: 'success',
        icon: <Play size={48} />,
        iconClass: 'success',
      };
    }

    if (confirmAction.type === 'complete')
      return {
        message: isMechanic
          ? '¿Seguro? Una vez completada, ya no podrás volver a editarla.'
          : '¿Seguro? El mecánico ya no podrá editarla, pero tú sí podrás realizar ajustes finales.',
        confirmLabel: 'Confirmar completada',
        confirmClass: 'success',
        icon: <CheckCircle2 size={48} />,
        iconClass: 'success',
      };

    if (confirmAction.type === 'deliver')
      return {
        message: '¿Seguro? Esta acción marcará la orden como entregada.',
        confirmLabel: 'Confirmar entrega',
        confirmClass: 'deliver',
        icon: <PackageCheck size={48} />,
        iconClass: 'deliver',
      };

    if (confirmAction.type === 'cancel-order')
      return {
        message:
          '¿Seguro? Esta acción cancelará la orden permanentemente y no se podrá deshacer.',
        confirmLabel: 'Confirmar cancelación',
        confirmClass: 'danger',
        icon: <XCircle size={48} />,
        iconClass: 'danger',
      };

    return {
      message: '¿Eliminar este ítem? Esta acción no se puede deshacer.',
      confirmLabel: 'Confirmar eliminación',
      confirmClass: 'danger',
      icon: <Trash2 size={48} />,
      iconClass: 'danger',
    };
  }, [confirmAction, mechanicId, mechanics, startKms, isMechanic]);

  if (!isOpen) return null;

  const activeItems = isCreateMode ? createForm.items : items;

  return (
    <>
      <div
        className="gm-modal-overlay"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="gm-modal-container gm-modal-container--large">
          <div className="gm-modal-header">
            <div className="gm-modal-header-left">
              <div className="gm-modal-header-icon">
                <Wrench size={22} />
              </div>
              <div className="gm-modal-header-meta">
                {isCreateMode ? (
                  <>
                    <h2 className="gm-modal-title">Nuevo Albarán</h2>
                    <p className="gm-modal-subtitle">
                      Registra una nueva orden de trabajo para un vehículo
                    </p>
                  </>
                ) : loading ? (
                  <h2 className="gm-modal-title">Cargando...</h2>
                ) : order ? (
                  <div className="gm-modal-header-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h2 className="gm-modal-title">
                        Albarán
                        <span className="header-order-number"> {displayOrderNumber}</span>
                      </h2>
                      <span className={`status-badge ${order.status.toLowerCase()}`}>
                        {STATUS_LABEL_MGMT[order.status]}
                      </span>
                    </div>
                    <p className="gm-modal-subtitle">
                      Gestiona los detalles y el estado de la reparación
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            <button className="gm-modal-close-btn" onClick={onClose} aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
          <div className="gm-modal-body">
            {!isCreateMode && loading && (
              <div className="modal-loading">Cargando detalle...</div>
            )}
            {!isCreateMode && !loading && !order && (
              <div className="modal-error">No se encontró la orden.</div>
            )}
            {error && <p className="modal-error-banner">{error}</p>}

            {isCreateMode && (
              <form id="workorder-form" onSubmit={handleSubmitCreate}>
                {loadingCatalogs ? (
                  <p className="modal-loading">Cargando datos...</p>
                ) : (
                  <>
                    <div className="gm-modal-form-section">
                      <div className="gm-modal-form-row">
                        <div className="gm-modal-form-group">
                          <label className="gm-modal-label">Cliente *</label>
                          <select
                            name="client"
                            value={createForm.client}
                            onChange={handleCreateInputChange}
                            required
                            className="gm-modal-input"
                          >
                            <option value="">Selecciona un cliente</option>
                            {clients
                              .filter((c) => c.active)
                              .map((c) => (
                                <option key={c._id} value={c._id}>
                                  {c.name} ({c.documentNumber})
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="gm-modal-form-group">
                          <label className="gm-modal-label">Vehículo *</label>
                          <select
                            name="vehicle"
                            value={createForm.vehicle}
                            onChange={handleCreateInputChange}
                            required
                            className="gm-modal-input"
                            disabled={!createForm.client}
                          >
                            <option value="">Selecciona un vehículo</option>
                            {availableVehicles.map((v) => (
                              <option key={v._id} value={v._id}>
                                {v.brand} {v.model} ({v.plate})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="gm-modal-form-row">
                        <div className="gm-modal-form-group">
                          <label className="gm-modal-label">Tipo de Servicio</label>
                          <select
                            name="serviceType"
                            value={createForm.serviceType}
                            onChange={handleCreateInputChange}
                            className="gm-modal-input"
                          >
                            {SERVICE_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {SERVICE_TYPE_LABELS[type]}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="gm-modal-form-group">
                          <label className="gm-modal-label">Mecánico (opcional)</label>
                          <select
                            name="mechanic"
                            value={createForm.mechanic}
                            onChange={handleCreateInputChange}
                            className="gm-modal-input"
                          >
                            <option value="">Sin asignar</option>
                            {mechanics.map((m) => (
                              <option key={m._id} value={m._id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="gm-modal-form-group" style={{ marginTop: '20px' }}>
                      <label className="gm-modal-label">Descripción *</label>
                      <textarea
                        name="description"
                        value={createForm.description}
                        onChange={handleCreateInputChange}
                        required
                        className="gm-modal-input"
                        placeholder="Describe el trabajo a realizar"
                        rows={2}
                        style={{ resize: 'vertical', minHeight: '80px' }}
                      />
                    </div>
                  </>
                )}
              </form>
            )}

            {!isCreateMode && order && (
              <>
                <div className="order-main-info">
                  <p className="order-description-main">{order.description}</p>
                  <div className="info-cards-grid">
                    <div className="info-card">
                      <div className="card-icon">
                        <Car size={18} />
                      </div>
                      <div className="card-content">
                        <label>Vehículo</label>
                        <p>
                          {order.vehicle.brand} {order.vehicle.model}
                        </p>
                        <span>
                          {order.vehicle.plate} • {vehicleKmsLabel}
                        </span>
                      </div>
                    </div>
                    <div className="info-card">
                      <div className="card-icon">
                        <User size={18} />
                      </div>
                      <div className="card-content">
                        <label>Cliente</label>
                        <p>{order.client.name}</p>
                        <span>{order.client.telephone || 'Sin teléfono'}</span>
                      </div>
                    </div>
                    <div className="info-card">
                      <div className="card-icon">
                        <Wrench size={18} />
                      </div>
                      <div className="card-content">
                        <label>Mecánico / Fecha</label>
                        <p>{order.mechanic?.name || 'Sin asignar'}</p>
                        <span>
                          {new Date(order.createdAt).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {hasStatusActions && (
                  <div className="status-actions-area">
                    <h4 className="status-actions-title">Acciones</h4>

                    {canAssignMechanic && (
                      <div className="action-group">
                        <select
                          className="gm-modal-input"
                          value={mechanicId}
                          disabled={saving || loadingMechanics}
                          onChange={(e) => setMechanicId(e.target.value)}
                          style={{ flex: 1 }}
                        >
                          <option value="">
                            {loadingMechanics ? 'Cargando...' : 'Asignar mecánico...'}
                          </option>
                          {mechanics.map((m) => (
                            <option key={m._id} value={m._id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="action-btn warning"
                          onClick={handleRequestAssign}
                          disabled={saving}
                        >
                          <UserPlus size={18} />
                          <span>Asignar</span>
                        </button>
                      </div>
                    )}

                    {canStart && (
                      <div className="action-group">
                        <input
                          type="number"
                          className="gm-modal-input"
                          placeholder="Kms actuales"
                          value={startKms}
                          onChange={(e) => setStartKms(e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button
                          className="action-btn start"
                          onClick={handleRequestStart}
                          disabled={saving}
                        >
                          <Play size={18} />
                          <span>Iniciar</span>
                        </button>
                      </div>
                    )}

                    <div className="main-actions-flex">
                      {canComplete && (
                        <button
                          className="action-btn success"
                          onClick={() => setConfirmAction({ type: 'complete' })}
                          disabled={saving}
                        >
                          <CheckCircle2 size={18} />
                          <span>Completar orden</span>
                        </button>
                      )}
                      {showDeliverButton && (
                        <button
                          className="action-btn deliver"
                          onClick={() => setConfirmAction({ type: 'deliver' })}
                          disabled={isDeliverDisabled || !canDeliver || saving}
                        >
                          <PackageCheck size={18} />
                          <span>Entregar a cliente</span>
                        </button>
                      )}
                      {canCancel && (
                        <button
                          className="action-btn cancel"
                          onClick={() => setConfirmAction({ type: 'cancel-order' })}
                          disabled={saving}
                        >
                          <XCircle size={18} />
                          <span>Cancelar albarán</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {(!isCreateMode ? !loading && !!order : !loadingCatalogs) && (
              <div className="items-section">
                <div className="items-header">
                  <h4>
                    {isCreateMode
                      ? 'Líneas / Conceptos'
                      : 'Líneas de trabajo / Repuestos'}
                  </h4>
                  <div className="items-tools">
                    {isCreateMode ? (
                      <button
                        type="button"
                        className="tool-btn"
                        onClick={handleAddCreateItem}
                      >
                        <Plus size={14} /> Añadir línea
                      </button>
                    ) : (
                      showItemEditControls && (
                        <>
                          <button
                            className="tool-btn"
                            onClick={handleAddEditItem}
                            disabled={!canEditItems || saving}
                          >
                            <Plus size={14} /> Añadir línea
                          </button>
                          <button
                            className="tool-btn highlight"
                            onClick={handleSaveItems}
                            disabled={!canEditItems || saving}
                          >
                            <Save size={14} /> Guardar cambios
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>

                <div className="modal-items-table-wrapper">
                  <table className="modal-items-table">
                    <thead>
                      <tr>
                        <th>Descripción</th>
                        <th>Cant.</th>
                        <th>€/ud</th>
                        <th className="subtotal-header">Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeItems.length === 0 ? (
                        <tr>
                          <td colSpan={5}>No hay conceptos registrados.</td>
                        </tr>
                      ) : (
                        activeItems.map((row, index) => {
                          const isDescLocked =
                            !isCreateMode &&
                            (!canEditItems ||
                              (isMechanic && isLaborItem(row.description)));
                          const isQtyLocked = !isCreateMode && !canEditItems;
                          const isPriceLocked =
                            !isCreateMode && (!canEditItems || isMechanic);
                          const showRemove = isCreateMode
                            ? activeItems.length > 1
                            : !NON_EDITABLE_STATUSES.includes(order?.status ?? 'PENDING');

                          return (
                            <tr key={index}>
                              {isMobile ? (
                                <td
                                  colSpan={5}
                                  style={{ padding: 0, border: 0, background: 'none' }}
                                >
                                  <div className="item-cell-mobile">
                                    <div className="item-row-top">
                                      <div className="item-col item-desc">
                                        <span className="item-label">Descripción</span>
                                        <input
                                          type="text"
                                          className="table-input"
                                          value={row.description}
                                          disabled={isDescLocked}
                                          placeholder="Ej: Filtro de aceite"
                                          onChange={(e) =>
                                            isCreateMode
                                              ? handleCreateItemChange(
                                                  index,
                                                  'description',
                                                  e.target.value,
                                                )
                                              : handleEditItemChange(
                                                  index,
                                                  'description',
                                                  e.target.value,
                                                )
                                          }
                                        />
                                      </div>
                                      <div className="item-col item-qty">
                                        <span className="item-label">Cant.</span>
                                        <input
                                          type="number"
                                          className="table-input"
                                          value={row.quantity}
                                          disabled={isQtyLocked}
                                          min="1"
                                          step="0.1"
                                          onChange={(e) =>
                                            isCreateMode
                                              ? handleCreateItemChange(
                                                  index,
                                                  'quantity',
                                                  e.target.value,
                                                )
                                              : handleEditItemChange(
                                                  index,
                                                  'quantity',
                                                  e.target.value,
                                                )
                                          }
                                        />
                                      </div>
                                      <div className="item-col item-price">
                                        <span className="item-label">€/ud</span>
                                        <input
                                          type="number"
                                          className="table-input"
                                          value={row.unitPrice}
                                          disabled={isPriceLocked}
                                          min="0"
                                          step="0.01"
                                          onChange={(e) =>
                                            isCreateMode
                                              ? handleCreateItemChange(
                                                  index,
                                                  'unitPrice',
                                                  e.target.value,
                                                )
                                              : handleEditItemChange(
                                                  index,
                                                  'unitPrice',
                                                  e.target.value,
                                                )
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className="item-row-bottom">
                                      <div className="item-col item-subtotal">
                                        <span className="item-label">Subtotal</span>
                                        <span className="subtotal-value">
                                          {row.subtotal.toLocaleString('es-ES', {
                                            style: 'currency',
                                            currency: 'EUR',
                                          })}
                                        </span>
                                      </div>
                                      {showRemove && (
                                        <div className="item-col item-action">
                                          <button
                                            type="button"
                                            className="remove-item-btn"
                                            disabled={
                                              !isCreateMode &&
                                              (!canEditItems ||
                                                (isMechanic &&
                                                  isLaborItem(row.description)))
                                            }
                                            onClick={() =>
                                              isCreateMode
                                                ? handleRemoveCreateItem(index)
                                                : setConfirmAction({
                                                    type: 'remove-item',
                                                    itemIndex: index,
                                                  })
                                            }
                                            title="Eliminar línea"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              ) : (
                                <>
                                  <td data-label="Descripción">
                                    <input
                                      type="text"
                                      className="table-input"
                                      value={row.description}
                                      disabled={isDescLocked}
                                      placeholder="Ej: Filtro de aceite"
                                      onChange={(e) =>
                                        isCreateMode
                                          ? handleCreateItemChange(
                                              index,
                                              'description',
                                              e.target.value,
                                            )
                                          : handleEditItemChange(
                                              index,
                                              'description',
                                              e.target.value,
                                            )
                                      }
                                    />
                                  </td>
                                  <td data-label="Cant.">
                                    <input
                                      type="number"
                                      className="table-input"
                                      value={row.quantity}
                                      disabled={isQtyLocked}
                                      min="1"
                                      step="0.1"
                                      onChange={(e) =>
                                        isCreateMode
                                          ? handleCreateItemChange(
                                              index,
                                              'quantity',
                                              e.target.value,
                                            )
                                          : handleEditItemChange(
                                              index,
                                              'quantity',
                                              e.target.value,
                                            )
                                      }
                                    />
                                  </td>
                                  <td data-label="€/ud">
                                    <input
                                      type="number"
                                      className="table-input"
                                      value={row.unitPrice}
                                      disabled={isPriceLocked}
                                      min="0"
                                      step="0.01"
                                      onChange={(e) =>
                                        isCreateMode
                                          ? handleCreateItemChange(
                                              index,
                                              'unitPrice',
                                              e.target.value,
                                            )
                                          : handleEditItemChange(
                                              index,
                                              'unitPrice',
                                              e.target.value,
                                            )
                                      }
                                    />
                                  </td>
                                  <td className="subtotal-value" data-label="Subtotal">
                                    {row.subtotal.toLocaleString('es-ES', {
                                      style: 'currency',
                                      currency: 'EUR',
                                    })}
                                  </td>
                                  <td>
                                    {showRemove && (
                                      <button
                                        type="button"
                                        className="remove-item-btn"
                                        disabled={
                                          !isCreateMode &&
                                          (!canEditItems ||
                                            (isMechanic && isLaborItem(row.description)))
                                        }
                                        onClick={() =>
                                          isCreateMode
                                            ? handleRemoveCreateItem(index)
                                            : setConfirmAction({
                                                type: 'remove-item',
                                                itemIndex: index,
                                              })
                                        }
                                        title="Eliminar línea"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="modal-total-summary">
                  <div className="total-row">
                    <span className="label">TOTAL (Base imponible):</span>
                    <span className="value">
                      {(isCreateMode ? createTotal : editTotal).toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="gm-modal-footer">
            {isCreateMode && (
              <button
                type="submit"
                form="workorder-form"
                className="gm-modal-btn gm-modal-btn-primary"
                disabled={saving || loadingCatalogs || !hasChanges}
              >
                <Save size={18} />
                <span>{saving ? 'Registrando...' : 'Registrar'}</span>
              </button>
            )}
            <button className="gm-modal-btn gm-modal-btn-secondary" onClick={onClose}>
              <X size={18} />
              <span>Cancelar</span>
            </button>
          </div>

          <ConfirmModal
            isOpen={!!(confirmAction && confirmCopy)}
            title="Confirmar acción"
            description={confirmCopy?.message}
            confirmText={confirmCopy?.confirmLabel}
            cancelText="Cancelar"
            onConfirm={handleConfirmAction}
            onCancel={() => setConfirmAction(null)}
            loading={saving}
            confirmClassName={confirmCopy?.confirmClass}
            icon={confirmCopy?.icon}
            iconClassName={confirmCopy?.iconClass}
          />
        </div>
      </div>
    </>
  );
};

export default WorkOrderModal;
