import {
  Car,
  CheckCircle2,
  PackageCheck,
  Play,
  Plus,
  Save,
  User,
  UserPlus,
  Wrench,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import DetailBackButton from '../../components/BackButton/BackButton';
import ConfirmModal from '../../components/modals/ConfirmModal';
import { useUserData } from '../../context/UserContext/UserContext';
import './WorkOrderDetail.css';
import { getMechanics } from '../../services/api/mechanics.api';
import {
  getWorkOrderById,
  updateWorkOrder,
  updateWorkOrderStatus,
} from '../../services/api/workOrders.api';
import type { Mechanic } from '../../types/mechanic.types';
import type { WorkOrder } from '../../types/workOrder.types';

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

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const capitalizeFirstLetter = (value: string) => {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const normalizeQuantityValue = (value: unknown) => {
  const digits = String(value ?? '').replace(/\D+/g, '');

  if (!digits) return 0;

  const withoutLeadingZeros = digits.replace(/^0+(?=\d)/, '');
  const normalized = Number(withoutLeadingZeros);

  return Number.isFinite(normalized) ? normalized : 0;
};

const normalizeItemLabel = (value: string) =>
  value
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const isLaborItem = (description: string) =>
  normalizeItemLabel(description) === 'mano de obra';

const toSpanishErrorMessage = (message: string, fallback: string) => {
  const normalized = message.trim().toLocaleLowerCase('es-ES');
  if (!normalized) return fallback;
  if (
    (normalized.includes('vehicle') ||
      normalized.includes('kms') ||
      normalized.includes('kilomet')) &&
    normalized.includes('decrease')
  ) {
    return 'El kilometraje del vehiculo no puede disminuir';
  }
  if (
    (normalized.includes('kms') || normalized.includes('kilomet')) &&
    (normalized.includes('required') ||
      normalized.includes('must') ||
      normalized.includes('valid'))
  ) {
    return 'Debes introducir un kilometraje valido para iniciar la orden';
  }
  if (
    normalized.includes('mechanic') &&
    (normalized.includes('required') || normalized.includes('must'))
  ) {
    return 'Debes seleccionar un mecánico para asignar la orden';
  }
  if (
    normalized.includes('can no longer be modified') ||
    normalized.includes('cannot be modified')
  ) {
    return 'Este albaran ya no se puede modificar en su estado actual';
  }
  if (normalized.includes('not found')) {
    return 'No se encontro el recurso solicitado';
  }
  if (normalized.includes('forbidden') || normalized.includes('not authorized')) {
    return 'No tienes permisos para realizar esta accion';
  }
  return message;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error) {
    return toSpanishErrorMessage(err.message, fallback);
  }

  return fallback;
};

const statusLabel: Record<WorkOrder['status'], string> = {
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignada',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  DELIVERED: 'Entregada',
};

const WorkOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUserData();

  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startKms, setStartKms] = useState<string>('');
  const [mechanicId, setMechanicId] = useState<string>('');
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loadingMechanics, setLoadingMechanics] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const role = user?.role;
  const isMechanic = role === 'MECHANIC';
  const isAdmin = role === 'ADMIN';
  const isManagement = role === 'ADMIN' || role === 'ADMINISTRATIVE';
  const backPath = isMechanic ? '/app/ordenes-trabajo' : '/app/albaranes';

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
  const canCancel =
    !!order &&
    isManagement &&
    (order.status === 'PENDING' || order.status === 'ASSIGNED');
  const showItemEditControls = !isMechanic || order?.status === 'IN_PROGRESS';

  const canEditItems = order
    ? isMechanic
      ? isAssignedMechanic && order?.status === 'IN_PROGRESS'
      : !['CANCELLED', 'DELIVERED'].includes(order?.status ?? 'PENDING')
    : false;

  const total = useMemo(
    () => items.reduce((acc, item) => acc + toSafeNumber(item.subtotal), 0),
    [items],
  );

  const displayOrderNumber = useMemo(() => {
    if (!order) return '';
    const ref = order._id.slice(-6).toUpperCase();
    const year = new Date(order.createdAt).getFullYear();
    return `${ref}/${year}`;
  }, [order]);

  const vehicleKmsLabel =
    typeof order?.vehicle.kms === 'number'
      ? `${Math.trunc(order.vehicle.kms).toLocaleString('es-ES')} km`
      : 'Sin kilometraje';

  const applyOrderData = useCallback((nextOrder: WorkOrder) => {
    setOrder(nextOrder);
    setConfirmAction(null);
    setItems(
      (nextOrder.items ?? []).map((item) => {
        const quantity = normalizeQuantityValue(item.quantity);
        const unitPrice = Math.max(0, toSafeNumber(item.unitPrice));
        const fallbackSubtotal = Number((quantity * unitPrice).toFixed(2));
        const subtotal = Math.max(0, toSafeNumber(item.subtotal)) || fallbackSubtotal;

        return {
          description: capitalizeFirstLetter(item.description ?? ''),
          quantity,
          unitPrice,
          subtotal,
        };
      }),
    );
  }, []);

  const refreshOrderSnapshot = useCallback(async () => {
    if (!id) return;
    const freshOrder = await getWorkOrderById(id);
    applyOrderData(freshOrder);
  }, [id, applyOrderData]);

  const loadOrder = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await getWorkOrderById(id);
      applyOrderData(response);
      setMechanicId('');
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'No se pudo cargar la orden de trabajo');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id, applyOrderData]);

  const loadMechanics = useCallback(async () => {
    try {
      setLoadingMechanics(true);
      const pageSize = 100;
      let page = 1;
      let totalPages = 1;
      const allMechanics: Mechanic[] = [];

      do {
        const res = await getMechanics({ page, limit: pageSize });
        allMechanics.push(...(res.users ?? []));
        totalPages = res?.pagination?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages);

      const uniqueById = new Map<string, Mechanic>();
      allMechanics.forEach((mechanic) => {
        uniqueById.set(mechanic._id, mechanic);
      });

      const availableMechanics = Array.from(uniqueById.values()).filter(
        (u) => u.role === 'MECHANIC' && u.active,
      );

      setMechanics(availableMechanics);
    } catch {
      setMechanics([]);
    } finally {
      setLoadingMechanics(false);
    }
  }, []);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!canAssignMechanic) return;
    loadMechanics();
  }, [canAssignMechanic, loadMechanics]);

  const handleStart = async () => {
    if (!order) return;

    const kmsValue = Number(startKms);

    try {
      setSaving(true);
      setError(null);
      await updateWorkOrderStatus(order._id, {
        status: 'IN_PROGRESS' as WorkOrder['status'],
        kms: kmsValue,
      });
      await refreshOrderSnapshot();
      setConfirmAction(null);
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'No se pudo iniciar la orden');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestStart = () => {
    if (!order || saving) return;

    if (!startKms.trim()) {
      setError('Debes introducir un kilometraje para iniciar la orden');
      return;
    }

    const kmsValue = Number(startKms);
    if (!Number.isFinite(kmsValue) || kmsValue < 0) {
      setError('Debes indicar un kilometraje valido para iniciar la orden');
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
      await updateWorkOrderStatus(order._id, {
        status: 'COMPLETED' as WorkOrder['status'],
      });
      await refreshOrderSnapshot();
      setConfirmAction(null);
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'No se pudo completar la orden');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestComplete = () => {
    if (!canComplete || saving) return;
    setError(null);
    setConfirmAction({ type: 'complete' });
  };

  const handleDismissConfirm = () => {
    setConfirmAction(null);
  };

  const handleDeliver = async () => {
    if (!order) return;

    try {
      setSaving(true);
      setError(null);
      await updateWorkOrderStatus(order._id, {
        status: 'DELIVERED' as WorkOrder['status'],
      });
      await refreshOrderSnapshot();
      setConfirmAction(null);
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'No se pudo entregar la orden');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDeliver = () => {
    if (!canDeliver || saving) return;
    setError(null);
    setConfirmAction({ type: 'deliver' });
  };

  const handleCancel = async () => {
    if (!order) return;

    try {
      setSaving(true);
      setError(null);
      await updateWorkOrderStatus(order._id, {
        status: 'CANCELLED' as WorkOrder['status'],
      });
      await refreshOrderSnapshot();
      setConfirmAction(null);
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'No se pudo cancelar el albaran');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestCancel = () => {
    if (!canCancel || saving) return;
    setError(null);
    setConfirmAction({ type: 'cancel-order' });
  };

  const handleAssignMechanic = async () => {
    if (!order || !mechanicId.trim()) return;

    try {
      setSaving(true);
      setError(null);
      await updateWorkOrderStatus(order._id, {
        status: 'ASSIGNED' as WorkOrder['status'],
        mechanic: mechanicId.trim(),
      });
      await refreshOrderSnapshot();
      setMechanicId('');
      setConfirmAction(null);
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'No se pudo asignar el mecanico');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestAssign = () => {
    if (!order || saving) return;
    if (!mechanicId.trim()) {
      setError('Debes seleccionar un mecánico para asignar la orden');
      return;
    }
    setError(null);
    setConfirmAction({ type: 'assign-mechanic' });
  };

  const handleItemChange = (
    index: number,
    field: 'description' | 'quantity' | 'unitPrice',
    value: string,
  ) => {
    setItems((prevItems) => {
      const nextItems = [...prevItems];
      const current = nextItems[index];

      if (!current) return prevItems;

      if (isMechanic && field === 'unitPrice') {
        return prevItems;
      }

      if (isMechanic && field === 'description' && isLaborItem(current.description)) {
        return prevItems;
      }

      if (field === 'description') {
        current.description = capitalizeFirstLetter(value);
      }

      if (field === 'quantity') {
        current.quantity = normalizeQuantityValue(value);
      }

      if (field === 'unitPrice') {
        const unitPrice = Number(value);
        current.unitPrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;
      }

      current.subtotal = Number((current.quantity * current.unitPrice).toFixed(2));

      return nextItems;
    });
  };

  const handleAddItem = () => {
    setItems((prevItems) => [
      ...prevItems,
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        subtotal: 0,
      },
    ]);
  };

  const handleRemoveItem = async (index: number) => {
    if (!order || !canEditItems) return;
    const targetItem = items[index];
    if (isMechanic && targetItem && isLaborItem(targetItem.description)) return;

    const nextItems = items.filter((_, itemIndex) => itemIndex !== index);

    try {
      setSaving(true);
      setError(null);

      const sanitizedItems = nextItems
        .map((item) => {
          const description = capitalizeFirstLetter(item.description.trim());
          return {
            description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: Number((item.quantity * item.unitPrice).toFixed(2)),
          };
        })
        .filter((item) => item.description.length > 0 && item.quantity > 0);

      await updateWorkOrder(order._id, { items: sanitizedItems });
      await refreshOrderSnapshot();
      setConfirmAction(null);
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'No se pudo eliminar el item');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestRemoveItem = (index: number) => {
    if (!canEditItems || saving) return;
    const targetItem = items[index];
    if (isMechanic && targetItem && isLaborItem(targetItem.description)) return;
    setError(null);
    setConfirmAction({ type: 'remove-item', itemIndex: index });
  };

  const confirmModalProps = useMemo(() => {
    if (!confirmAction) return null;

    if (confirmAction.type === 'start-order') {
      return {
        title: '¿Iniciar orden de trabajo?',
        description: `Se registrará la orden con ${startKms} km e iniciará el proceso de reparación.`,
        confirmText: 'Iniciar ahora',
        confirmClassName: 'accept',
        icon: <Play size={32} />,
        iconClassName: 'accept',
      };
    }

    if (confirmAction.type === 'complete') {
      return {
        title: '¿Completar orden?',
        description: isMechanic
          ? '¿Seguro? Una vez completada, ya no podrás volver a editar los ítems.'
          : '¿Seguro? El mecánico ya no podrá editarla, pero tú sí podrás realizar ajustes finales.',
        confirmText: 'Sí, completar',
        confirmClassName: 'success',
        icon: <CheckCircle2 size={32} />,
        iconClassName: 'success',
      };
    }

    if (confirmAction.type === 'deliver') {
      return {
        title: '¿Entregar orden?',
        description:
          'Esta acción marcará el albarán como entregado al cliente. No podrás volver a editarlo.',
        confirmText: 'Confirmar entrega',
        confirmClassName: 'deliver',
        icon: <PackageCheck size={32} />,
        iconClassName: 'deliver',
      };
    }

    if (confirmAction.type === 'cancel-order') {
      return {
        title: '¿Cancelar orden?',
        description:
          'Esta acción cancelará la orden permanentemente y no se podrá deshacer.',
        confirmText: 'Sí, cancelar',
        confirmClassName: 'reject',
        icon: <XCircle size={32} />,
        iconClassName: 'reject',
      };
    }

    if (confirmAction.type === 'assign-mechanic') {
      const selectedMec = mechanics.find((m) => m._id === mechanicId);
      return {
        title: '¿Asignar mecánico?',
        description: `¿Asignar esta orden a ${selectedMec?.name || 'este mecánico'}?`,
        confirmText: 'Sí, asignar',
        confirmClassName: 'deliver',
        icon: <UserPlus size={32} />,
        iconClassName: 'deliver',
      };
    }

    return {
      title: '¿Eliminar item?',
      description: 'Esta acción eliminará el item del albarán y no se puede deshacer.',
      confirmText: 'Eliminar',
      confirmClassName: 'reject',
      icon: <AlertCircle size={32} />,
      iconClassName: 'reject',
    };
  }, [confirmAction, startKms, isMechanic, mechanics, mechanicId]);

  const handleConfirmAction = async () => {
    if (!confirmAction || saving) return;

    if (confirmAction.type === 'start-order') {
      await handleStart();
      return;
    }

    if (confirmAction.type === 'complete') {
      await handleComplete();
      return;
    }

    if (confirmAction.type === 'cancel-order') {
      await handleCancel();
      return;
    }

    if (confirmAction.type === 'deliver') {
      await handleDeliver();
      return;
    }

    if (confirmAction.type === 'assign-mechanic') {
      await handleAssignMechanic();
      return;
    }

    await handleRemoveItem(confirmAction.itemIndex);
  };

  const handleSaveItems = async () => {
    if (!order) return;

    try {
      setSaving(true);
      setError(null);
      const sanitizedItems = items
        .map((item) => {
          const description = capitalizeFirstLetter(item.description.trim());
          return {
            description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: Number((item.quantity * item.unitPrice).toFixed(2)),
          };
        })
        .filter((item) => item.description.length > 0 && item.quantity > 0);

      await updateWorkOrder(order._id, { items: sanitizedItems });
      await refreshOrderSnapshot();
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'No se pudieron guardar los items');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="workorder-detail-loading">Cargando detalle de orden...</section>
    );
  }

  if (!order) {
    return (
      <section className="workorder-detail-empty">
        <p>No se encontró la orden solicitada.</p>
        <DetailBackButton onClick={() => navigate(backPath)} label="Volver" />
      </section>
    );
  }

  return (
    <div className="workorder-detail-page">
      <div className="workorder-detail-head">
        <div>
          <DetailBackButton onClick={() => navigate(backPath)} label="Volver" />
          <h1>Orden #{displayOrderNumber}</h1>
          <p>{order.description}</p>
        </div>

        <span className={`status ${order.status}`}>{statusLabel[order.status]}</span>
      </div>

      {error && <p className="workorder-detail-error">{error}</p>}

      <section className="workorder-detail-info-grid">
        <article className="detail-card">
          <h3>
            <Car size={16} /> Vehículo
          </h3>
          <p>
            {order.vehicle.brand} {order.vehicle.model} - {order.vehicle.plate}
          </p>
          <span>{vehicleKmsLabel}</span>
        </article>

        <article className="detail-card">
          <h3>
            <User size={16} /> Cliente
          </h3>
          <p>{order.client.name}</p>
          <span>{order.client.telephone || order.client.email || 'Sin contacto'}</span>
        </article>

        <article className="detail-card">
          <h3>
            <Wrench size={16} /> Mecánico
          </h3>
          <p>{order.mechanic?.name || 'Sin asignar'}</p>
          <span>{new Date(order.createdAt).toLocaleDateString('es-ES')}</span>
        </article>
      </section>

      <section className="workorder-actions">
        {canAssignMechanic && (
          <div className="assign-action-group">
            <select
              className="mechanic-input"
              value={mechanicId}
              disabled={!canAssignMechanic || saving || loadingMechanics}
              onChange={(event) => setMechanicId(event.target.value)}
            >
              <option value="">
                {loadingMechanics ? 'Cargando mecánicos...' : 'Selecciona mecánico'}
              </option>
              {mechanics.map((mechanic) => (
                <option key={mechanic._id} value={mechanic._id}>
                  {mechanic.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="action-button action-button--warning"
              disabled={!canAssignMechanic || saving}
              onClick={handleRequestAssign}
            >
              <UserPlus size={14} />
              Asignar mecanico
            </button>
          </div>
        )}

        {canStart && (
          <div className="start-action-group">
            <input
              type="number"
              min={0}
              className="kms-input"
              placeholder="Actualizar kilometraje"
              value={startKms}
              disabled={saving}
              onChange={(event) => setStartKms(event.target.value)}
            />

            <button
              type="button"
              className="action-button action-button--start"
              disabled={saving}
              onClick={handleRequestStart}
            >
              <Play size={14} />
              Iniciar orden
            </button>
          </div>
        )}

        {canComplete && (
          <button
            type="button"
            className="action-button action-button--success"
            disabled={saving}
            onClick={handleRequestComplete}
          >
            <CheckCircle2 size={14} />
            Completar orden
          </button>
        )}

        {showDeliverButton && (
          <button
            type="button"
            className="action-button action-button--deliver"
            disabled={!canDeliver || saving}
            onClick={handleRequestDeliver}
          >
            <PackageCheck size={14} />
            Marcar como entregada
          </button>
        )}

        {canCancel && (
          <button
            type="button"
            className="action-button action-button--cancel"
            disabled={saving}
            onClick={handleRequestCancel}
          >
            <XCircle size={14} />
            Cancelar orden
          </button>
        )}
      </section>

      <section className="workorder-items-section">
        <div className="workorder-items-header">
          <h2>Items de la orden</h2>
          {showItemEditControls && (
            <div className="workorder-items-tools">
              <button
                type="button"
                className="action-button"
                disabled={!canEditItems || saving}
                onClick={handleAddItem}
              >
                <Plus size={14} />
                Añadir item
              </button>
              <button
                type="button"
                className="action-button"
                disabled={!canEditItems || saving}
                onClick={handleSaveItems}
              >
                <Save size={14} /> Guardar cambios
              </button>
            </div>
          )}
        </div>

        <p className="items-permission-note">
          {canEditItems
            ? isManagement && order?.status === 'COMPLETED'
              ? 'Puedes revisar y ajustar items antes de marcar la orden como entregada.'
              : 'Puedes editar los items en este estado.'
            : isMechanic
              ? 'Solo puedes editar items cuando la orden está en proceso.'
              : 'Esta orden no permite edicion de items en su estado actual.'}
        </p>

        <div className="workorder-items-list">
          {items.length === 0 ? (
            <p className="workorder-items-empty">Esta orden todavía no tiene items.</p>
          ) : (
            items.map((item, index) => {
              const isLockedLaborItemForMechanic =
                isMechanic && isLaborItem(item.description);
              const canEditThisDescription =
                canEditItems && !isLockedLaborItemForMechanic;
              const canEditThisQuantity = canEditItems;
              const canEditThisUnitPrice = canEditItems && !isMechanic;
              const canRemoveThisItem = canEditItems && !isLockedLaborItemForMechanic;
              return (
                <article key={`item-${index}`} className="workorder-item-card">
                  <label>
                    Descripción
                    <input
                      type="text"
                      value={item.description}
                      disabled={!canEditThisDescription}
                      onChange={(event) =>
                        handleItemChange(index, 'description', event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Cantidad
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={item.quantity === 0 ? '' : item.quantity}
                      disabled={!canEditThisQuantity}
                      onChange={(event) =>
                        handleItemChange(index, 'quantity', event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Precio unidad
                    <input
                      type="number"
                      min={1}
                      step="0.01"
                      value={item.unitPrice === 0 ? '' : item.unitPrice}
                      disabled={!canEditThisUnitPrice}
                      onChange={(event) =>
                        handleItemChange(index, 'unitPrice', event.target.value)
                      }
                    />
                  </label>

                  <div className="workorder-item-subtotal">
                    <strong>Subtotal:</strong> {toSafeNumber(item.subtotal).toFixed(2)}{' '}
                    EUR
                  </div>

                  {showItemEditControls && canRemoveThisItem && (
                    <button
                      type="button"
                      className="remove-item-button"
                      disabled={!canRemoveThisItem || saving}
                      onClick={() => handleRequestRemoveItem(index)}
                    >
                      Eliminar item
                    </button>
                  )}
                </article>
              );
            })
          )}
        </div>

        <div className="workorder-total">
          <strong>Total:</strong> {toSafeNumber(total).toFixed(2)} EUR
        </div>
      </section>

      {confirmAction && confirmModalProps && (
        <ConfirmModal
          isOpen={!!confirmAction}
          title={confirmModalProps.title}
          description={confirmModalProps.description}
          confirmText={confirmModalProps.confirmText}
          confirmClassName={confirmModalProps.confirmClassName}
          icon={confirmModalProps.icon}
          iconClassName={confirmModalProps.iconClassName}
          onConfirm={() => void handleConfirmAction()}
          onCancel={handleDismissConfirm}
          loading={saving}
        />
      )}
    </div>
  );
};

export default WorkOrderDetail;
