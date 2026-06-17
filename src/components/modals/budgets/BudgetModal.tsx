import { Plus, X, CheckCircle, XCircle, Trash, Edit3, Save } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';

import {
  BudgetStatus,
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  BUDGET_STATUS_LABELS,
} from '../../../types/budget.types';
import type { Budget, BudgetItem, ServiceType } from '../../../types/budget.types';
import type { Client } from '../../../types/client.types';
import type { Vehicle } from '../../../types/vehicle.types';

import './BudgetModal.css';

type BudgetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingBudget: Budget | null;
  budgetDisplayNumber: string | null;
  formData: {
    client: string;
    vehicle: string;
    description: string;
    serviceType: ServiceType;
    status: BudgetStatus;
    items: BudgetItem[];
  };
  clients: Client[];
  vehicles: Vehicle[];
  submitting: boolean;
  isReadOnly: boolean;
  totalAmount: number;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
  onItemChange: (index: number, field: keyof BudgetItem, value: string | number) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onPrint: () => void;
  onSendEmail: () => void;
  onStatusUpdate: (id: string, action: 'accept' | 'reject' | 'deactivate') => void;
  calculateSubtotal: (item: BudgetItem) => number;
};

function areItemsEqual(a: BudgetItem[], b: BudgetItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].description !== b[i].description ||
      a[i].quantity !== b[i].quantity ||
      a[i].unitPrice !== b[i].unitPrice
    ) {
      return false;
    }
  }
  return true;
}

function resolveId(field: string | { _id: string }): string {
  return typeof field === 'object' ? field._id : field;
}

const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  editingBudget,
  budgetDisplayNumber,
  formData,
  clients,
  vehicles,
  submitting,
  isReadOnly,
  totalAmount,
  onInputChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
  onStatusUpdate,
  calculateSubtotal,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 480);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const hasChanges = useMemo(() => {
    if (!editingBudget) return true; // creación: siempre permitir guardar
    return !(
      resolveId(editingBudget.client) === formData.client &&
      resolveId(editingBudget.vehicle) === formData.vehicle &&
      editingBudget.description === formData.description &&
      editingBudget.serviceType === formData.serviceType &&
      editingBudget.status === formData.status &&
      areItemsEqual(editingBudget.items, formData.items)
    );
  }, [editingBudget, formData]);

  if (!isOpen) return null;

  const availableVehicles = vehicles.filter(
    (v) => v.active && resolveId(v.client) === formData.client,
  );

  const isPending = editingBudget?.status === BudgetStatus.PENDING;

  const isFormValid =
    !!formData.client &&
    !!formData.vehicle &&
    formData.description.trim() !== '' &&
    formData.items.length > 0;

  const isSaveDisabled =
    submitting || !isFormValid || (editingBudget ? !hasChanges : false);

  const handleNumericChange = (
    index: number,
    field: keyof BudgetItem,
    raw: string,
    fallback = 0,
  ) => {
    const parsed = parseFloat(raw);
    onItemChange(index, field, isNaN(parsed) ? fallback : parsed);
  };

  return (
    <div
      className="gm-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="gm-modal-container gm-modal-container--large">
        <div className="gm-modal-header">
          <div className="gm-modal-header-left">
            <div className="gm-modal-header-icon">
              <Edit3 size={22} />
            </div>
            <div className="gm-modal-header-meta">
              {editingBudget ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 className="gm-modal-title">
                      {isReadOnly ? 'Ver Presupuesto' : 'Editar Presupuesto'}
                      {budgetDisplayNumber && (
                        <span className="header-order-number">
                          {' '}
                          {budgetDisplayNumber}
                        </span>
                      )}
                    </h2>
                    <span
                      className={`status-badge ${editingBudget.status.toLowerCase()}`}
                    >
                      {BUDGET_STATUS_LABELS[editingBudget.status]}
                    </span>
                  </div>
                  <p className="gm-modal-subtitle">
                    Gestiona los detalles y conceptos del presupuesto
                  </p>
                </>
              ) : (
                <>
                  <h2 className="gm-modal-title">Nuevo Presupuesto</h2>
                  <p className="gm-modal-subtitle">
                    Crea un nuevo presupuesto para un vehículo
                  </p>
                </>
              )}
            </div>
          </div>
          <button className="gm-modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="gm-modal-body">
          <form id="budget-form" onSubmit={onSubmit}>
            <fieldset className="budget-form-fieldset" disabled={isReadOnly}>
              <div className="gm-modal-form-section">
                <div className="gm-modal-form-row">
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label">Cliente *</label>
                    <select
                      name="client"
                      value={formData.client}
                      onChange={onInputChange}
                      required
                      className="gm-modal-input"
                      disabled={!!editingBudget || isReadOnly}
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
                      value={formData.vehicle}
                      onChange={onInputChange}
                      required
                      className="gm-modal-input"
                      disabled={!formData.client || !!editingBudget || isReadOnly}
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
                      value={formData.serviceType}
                      onChange={onInputChange}
                      required
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
                    <label className="gm-modal-label">Estado</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={onInputChange}
                      className="gm-modal-input"
                    >
                      {Object.entries(BUDGET_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="gm-modal-form-group" style={{ marginTop: '20px' }}>
                <label className="gm-modal-label">Descripción General *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={onInputChange}
                  required
                  className="gm-modal-input"
                  placeholder="Ej: Revisión completa y cambio de pastillas"
                  rows={2}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>

              {/* Items */}
              <div className="items-section">
                <div className="items-header">
                  <h4>Líneas de Trabajo / Repuestos</h4>
                  {!isReadOnly && (
                    <div className="items-tools">
                      <button type="button" className="tool-btn" onClick={onAddItem}>
                        <Plus size={14} /> Añadir línea
                      </button>
                    </div>
                  )}
                </div>

                <div className="modal-items-table-wrapper">
                  <table className="modal-items-table">
                    <thead>
                      <tr>
                        <th>Descripción</th>
                        <th>Cant.</th>
                        <th>€/ud</th>
                        <th className="subtotal-header">Subtotal</th>
                        {!isReadOnly && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.length === 0 ? (
                        <tr>
                          <td colSpan={isReadOnly ? 4 : 5}>
                            No hay conceptos registrados.
                          </td>
                        </tr>
                      ) : (
                        formData.items.map((row, index) => (
                          <tr key={index}>
                            {isMobile ? (
                              <td
                                colSpan={isReadOnly ? 4 : 5}
                                style={{ padding: 0, border: 0 }}
                              >
                                <div className="item-cell-mobile">
                                  <div className="item-row-top">
                                    <div className="item-col item-desc">
                                      <span className="item-label">Descripción</span>
                                      <input
                                        type="text"
                                        className="table-input"
                                        value={row.description}
                                        disabled={isReadOnly}
                                        onChange={(e) =>
                                          onItemChange(
                                            index,
                                            'description',
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Ej: Filtro de aceite"
                                        required={!isReadOnly}
                                      />
                                    </div>
                                    <div className="item-col item-qty">
                                      <span className="item-label">Cant.</span>
                                      <input
                                        type="number"
                                        className="table-input"
                                        value={row.quantity}
                                        disabled={isReadOnly}
                                        onChange={(e) =>
                                          handleNumericChange(
                                            index,
                                            'quantity',
                                            e.target.value,
                                            1,
                                          )
                                        }
                                        min="1"
                                        step="0.1"
                                        required={!isReadOnly}
                                      />
                                    </div>
                                    <div className="item-col item-price">
                                      <span className="item-label">€/ud</span>
                                      <input
                                        type="number"
                                        className="table-input"
                                        value={row.unitPrice}
                                        disabled={isReadOnly}
                                        onChange={(e) =>
                                          handleNumericChange(
                                            index,
                                            'unitPrice',
                                            e.target.value,
                                            0,
                                          )
                                        }
                                        min="0"
                                        step="0.01"
                                        required={!isReadOnly}
                                      />
                                    </div>
                                  </div>
                                  <div className="item-row-bottom">
                                    <div className="item-col item-subtotal">
                                      <span className="item-label">Subtotal</span>
                                      <span className="subtotal-value">
                                        {calculateSubtotal(row).toLocaleString('es-ES', {
                                          style: 'currency',
                                          currency: 'EUR',
                                        })}
                                      </span>
                                    </div>
                                    {!isReadOnly && (
                                      <div className="item-action">
                                        <button
                                          type="button"
                                          className="remove-item-btn"
                                          onClick={() => onRemoveItem(index)}
                                          title="Eliminar línea"
                                        >
                                          <Trash size={16} />
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
                                    disabled={isReadOnly}
                                    onChange={(e) =>
                                      onItemChange(index, 'description', e.target.value)
                                    }
                                    placeholder="Ej: Filtro de aceite"
                                    required={!isReadOnly}
                                  />
                                </td>
                                <td data-label="Cant.">
                                  <input
                                    type="number"
                                    className="table-input"
                                    value={row.quantity}
                                    disabled={isReadOnly}
                                    onChange={(e) =>
                                      handleNumericChange(
                                        index,
                                        'quantity',
                                        e.target.value,
                                        1,
                                      )
                                    }
                                    min="1"
                                    step="0.1"
                                    required={!isReadOnly}
                                  />
                                </td>
                                <td data-label="€/ud">
                                  <input
                                    type="number"
                                    className="table-input"
                                    value={row.unitPrice}
                                    disabled={isReadOnly}
                                    onChange={(e) =>
                                      handleNumericChange(
                                        index,
                                        'unitPrice',
                                        e.target.value,
                                        0,
                                      )
                                    }
                                    min="0"
                                    step="0.01"
                                    required={!isReadOnly}
                                  />
                                </td>
                                <td className="subtotal-value" data-label="Subtotal">
                                  {calculateSubtotal(row).toLocaleString('es-ES', {
                                    style: 'currency',
                                    currency: 'EUR',
                                  })}
                                </td>
                                {!isReadOnly && (
                                  <td>
                                    <button
                                      type="button"
                                      className="remove-item-btn"
                                      onClick={() => onRemoveItem(index)}
                                      title="Eliminar línea"
                                    >
                                      <Trash size={16} />
                                    </button>
                                  </td>
                                )}
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="modal-total-summary">
                  <div className="total-row">
                    <span className="label">TOTAL (Base imponible):</span>
                    <span className="value">
                      {totalAmount.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </fieldset>
          </form>
        </div>

        {/* Footer */}
        <div className="gm-modal-footer">
          {editingBudget && isPending && (
            <>
              <button
                type="button"
                className="action-btn success accept-budget"
                onClick={() => onStatusUpdate(editingBudget._id, 'accept')}
                disabled={submitting}
              >
                <CheckCircle size={18} />
                <span>Aceptar</span>
              </button>
              <button
                type="button"
                className="action-btn cancel reject-budget"
                onClick={() => onStatusUpdate(editingBudget._id, 'reject')}
                disabled={submitting}
              >
                <XCircle size={18} />
                <span>Rechazar</span>
              </button>
            </>
          )}
          {!isReadOnly && (
            <button
              type="submit"
              form="budget-form"
              className="gm-modal-btn gm-modal-btn-primary"
              disabled={isSaveDisabled}
            >
              <Save size={18} />
              <span>
                {submitting
                  ? editingBudget
                    ? 'Actualizando...'
                    : 'Registrando...'
                  : editingBudget
                    ? 'Actualizar'
                    : 'Registrar'}
              </span>
            </button>
          )}
          <button className="gm-modal-btn gm-modal-btn-secondary" onClick={onClose}>
            <X size={18} />
            <span>Cancelar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetModal;
