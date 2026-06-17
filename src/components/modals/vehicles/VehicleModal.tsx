import { X, Edit2, Car, Image as ImageIcon, Save /* , Calendar */ } from 'lucide-react';
import React, { useState, useMemo, useRef, useEffect } from 'react';

import * as vehiclesApi from '../../../services/api/vehicles.api';
import type { Client } from '../../../types/client.types';
import type { Vehicle } from '../../../types/vehicle.types';
import type { WorkOrder } from '../../../types/workOrder.types';
import { capitalizeWords } from '../../../utils/stringUtils';

import './VehicleModal.css';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignada',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Pend. entrega',
  DELIVERED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingVehicle?: Vehicle | null;
  client?: Client | null;
  clients?: Client[];
  clientSearch?: string;
  onClientSearchChange?: (val: string, resolvedId: string) => void;
  recentRepairs?: WorkOrder[];
  loadingRepairs?: boolean;
  onRepairClick?: (workOrderId: string) => void;
}

const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  editingVehicle = null,
  client = null,
  clients,
  clientSearch,
  onClientSearchChange,
  recentRepairs,
  loadingRepairs,
  onRepairClick,
}) => {
  const isStandaloneMode = Array.isArray(clients);

  const [vehicleFormData, setVehicleFormData] = useState({
    plate: editingVehicle?.plate || '',
    brand: editingVehicle?.brand || '',
    model: editingVehicle?.model || '',
    year: editingVehicle?.year?.toString() || '',
    kms: editingVehicle?.kms?.toString() || '',
    nextRevision: editingVehicle?.nextRevision
      ? new Date(editingVehicle.nextRevision).toISOString().split('T')[0]
      : '',
    clientId: editingVehicle
      ? typeof editingVehicle.client === 'object'
        ? editingVehicle.client._id
        : (editingVehicle.client as string)
      : client?._id || '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    editingVehicle?.image?.url || null,
  );
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVehicleFormData((prev) => ({
      ...prev,
      [name]:
        name === 'kms'
          ? value.replace(/\D/g, '')
          : name === 'brand'
            ? capitalizeWords(value)
            : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('⚠️ La imagen es demasiado pesada (máximo 5MB).');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClose = () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    onClose();
  };

  const hasChanges = useMemo(() => {
    if (!editingVehicle) {
      const clientResolved = isStandaloneMode ? vehicleFormData.clientId !== '' : true;
      return (
        vehicleFormData.plate.trim() !== '' &&
        vehicleFormData.brand.trim() !== '' &&
        vehicleFormData.model.trim() !== '' &&
        clientResolved
      );
    }
    const originalNextRevision = editingVehicle.nextRevision
      ? new Date(editingVehicle.nextRevision).toISOString().split('T')[0]
      : '';
    return (
      vehicleFormData.plate !== (editingVehicle.plate || '') ||
      vehicleFormData.brand !== (editingVehicle.brand || '') ||
      vehicleFormData.model !== (editingVehicle.model || '') ||
      vehicleFormData.year !== (editingVehicle.year?.toString() || '') ||
      vehicleFormData.kms !== (editingVehicle.kms?.toString() || '') ||
      vehicleFormData.nextRevision !== originalNextRevision ||
      selectedFile !== null
    );
  }, [vehicleFormData, editingVehicle, selectedFile, isStandaloneMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingVehicle) {
        await vehiclesApi.updateVehicle(editingVehicle._id, {
          plate: vehicleFormData.plate,
          brand: capitalizeWords(vehicleFormData.brand),
          model: capitalizeWords(vehicleFormData.model),
          client: vehicleFormData.clientId,
          year: vehicleFormData.year ? parseInt(vehicleFormData.year) : undefined,
          kms: vehicleFormData.kms ? parseInt(vehicleFormData.kms) : undefined,
          nextRevision: vehicleFormData.nextRevision || undefined,
        });
        if (selectedFile) {
          const imgData = new FormData();
          imgData.append('image', selectedFile);
          await vehiclesApi.updateVehicleImage(editingVehicle._id, imgData);
        }
      } else {
        const fData = new FormData();
        fData.append('plate', vehicleFormData.plate);
        fData.append('brand', capitalizeWords(vehicleFormData.brand));
        fData.append('model', vehicleFormData.model);
        fData.append('client', vehicleFormData.clientId);
        if (vehicleFormData.year) fData.append('year', vehicleFormData.year);
        if (vehicleFormData.kms) fData.append('kms', vehicleFormData.kms);
        if (vehicleFormData.nextRevision)
          fData.append('nextRevision', vehicleFormData.nextRevision);
        if (selectedFile) fData.append('image', selectedFile);
        await vehiclesApi.createVehicle(fData);
      }
      handleClose();
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar el vehículo');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="gm-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="gm-modal-container gm-modal-container--large">
        <div className="gm-modal-header">
          <div className="gm-modal-header-left">
            <div className="gm-modal-header-icon">
              <Car size={22} />
            </div>
            <div className="gm-modal-header-meta">
              <h2 className="gm-modal-title">
                {editingVehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
              </h2>
              <p className="gm-modal-subtitle">
                {editingVehicle
                  ? 'Gestiona la información y el historial del vehículo'
                  : 'Registra un nuevo vehículo en la base de datos'}
              </p>
            </div>
          </div>
          <button className="gm-modal-close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="gm-modal-body">
            {/* Imagen */}
            <div className="vehicle-modal-image-section">
              <div
                className="vehicle-modal-image-preview-container"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="vehicle-modal-image-preview"
                  />
                ) : (
                  <div className="vehicle-modal-image-placeholder">
                    <ImageIcon size={40} />
                    <span>Añadir Foto</span>
                  </div>
                )}
                <div className="vehicle-modal-image-overlay">
                  <Edit2 size={20} />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="vehicle-modal-file-input"
              />
            </div>

            <div className="gm-modal-form-section">
              {/* ── Propietario y Matrícula ── */}
              <div className="gm-modal-form-row">
                {isStandaloneMode ? (
                  /* Modo standalone: selector de cliente con datalist */
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label" htmlFor="v-clientSearch">
                      Propietario *
                    </label>
                    <input
                      type="text"
                      id="v-clientSearch"
                      className="gm-modal-input"
                      value={clientSearch ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = clients?.find(
                          (c) => `${c.name} (${c.documentNumber})` === val,
                        );
                        onClientSearchChange?.(val, match?._id ?? '');
                        if (match) {
                          setVehicleFormData((prev) => ({
                            ...prev,
                            clientId: match._id,
                          }));
                        } else {
                          setVehicleFormData((prev) => ({ ...prev, clientId: '' }));
                        }
                      }}
                      required
                      placeholder="Busca un cliente..."
                      readOnly={!!editingVehicle}
                      list="vm-clients-list"
                    />
                    {!editingVehicle && (
                      <datalist id="vm-clients-list">
                        {clients?.map((c) => (
                          <option key={c._id} value={`${c.name} (${c.documentNumber})`} />
                        ))}
                      </datalist>
                    )}
                  </div>
                ) : (
                  /* Modo cliente fijo (desde Clients) */
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label">Propietario</label>
                    <input
                      type="text"
                      className="gm-modal-input gm-modal-input--readonly"
                      value={client?.name || ''}
                      readOnly
                    />
                  </div>
                )}

                {/* Matrícula */}
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label" htmlFor="v-plate">
                    Matrícula *
                  </label>
                  <input
                    type="text"
                    id="v-plate"
                    name="plate"
                    className="gm-modal-input"
                    value={vehicleFormData.plate}
                    onChange={handleInputChange}
                    required
                    placeholder="1234ABC"
                  />
                </div>
              </div>

              {/* Marca y Modelo */}
              <div className="gm-modal-form-row">
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label" htmlFor="v-brand">
                    Marca *
                  </label>
                  <input
                    type="text"
                    id="v-brand"
                    name="brand"
                    className="gm-modal-input"
                    value={vehicleFormData.brand}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label" htmlFor="v-model">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    id="v-model"
                    name="model"
                    className="gm-modal-input"
                    value={vehicleFormData.model}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* Año y Kilómetros */}
              <div className="gm-modal-form-row">
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label" htmlFor="v-year">
                    Año
                  </label>
                  <input
                    type="number"
                    id="v-year"
                    name="year"
                    className="gm-modal-input"
                    value={vehicleFormData.year}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label" htmlFor="v-kms">
                    Kilómetros
                  </label>
                  <input
                    type="text"
                    id="v-kms"
                    name="kms"
                    className="gm-modal-input"
                    value={vehicleFormData.kms
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    onChange={handleInputChange}
                    placeholder="Ej: 50000"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>

            {/* ── Últimas Reparaciones (solo cuando se edita y se pasan los datos) ── */}
            {editingVehicle && recentRepairs !== undefined && (
              <div className="vehicle-modal-repairs-section">
                <div className="gm-modal-section-divider">
                  <span>Últimas Reparaciones</span>
                </div>
                {loadingRepairs ? (
                  <div className="vehicle-modal-repairs-loading">
                    <div className="vehicle-modal-mini-spinner" />
                    <span>Cargando historial...</span>
                  </div>
                ) : recentRepairs.length > 0 ? (
                  <div className="vehicle-modal-repairs-list">
                    {recentRepairs.map((repair) => (
                      <div
                        key={repair._id}
                        className="vehicle-modal-repair-card"
                        onClick={() => onRepairClick?.(repair._id)}
                        title="Ver detalle de la reparación"
                        style={{ cursor: onRepairClick ? 'pointer' : 'default' }}
                      >
                        <div className="vehicle-modal-repair-info">
                          <span className="vehicle-modal-repair-date">
                            {new Date(repair.createdAt).toLocaleDateString()}
                          </span>
                          <span className="vehicle-modal-repair-description">
                            {repair.description}
                          </span>
                        </div>
                        <span
                          className={`vehicle-modal-status-badge ${repair.status
                            .toLowerCase()
                            .replace('_', '-')}`}
                        >
                          {STATUS_LABELS[repair.status] || repair.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="vehicle-modal-no-repairs">
                    No hay reparaciones registradas para este vehículo.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="gm-modal-footer">
            <button
              type="submit"
              className="gm-modal-btn gm-modal-btn-primary"
              disabled={submitting || !hasChanges}
            >
              <Save size={18} />
              <span>
                {submitting
                  ? editingVehicle
                    ? 'Actualizando...'
                    : 'Registrando...'
                  : editingVehicle
                    ? 'Actualizar'
                    : 'Registrar'}
              </span>
            </button>
            <button
              type="button"
              className="gm-modal-btn gm-modal-btn-secondary"
              onClick={handleClose}
            >
              <X size={18} />
              <span>Cancelar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleModal;
