import { X, Plus, User, Save } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import VehicleModal from '../../../components/modals/vehicles/VehicleModal';
import * as vehiclesApi from '../../../services/api/vehicles.api';
import type { Client } from '../../../types/client.types';
import type { Vehicle } from '../../../types/vehicle.types';
import { capitalizeWords } from '../../../utils/stringUtils';

import './ClientModal.css';

interface ClientFormData {
  name: string;
  email: string;
  telephoneCountry: string;
  telephoneNumber: string;
  documentNumber: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
}

const DEFAULT_FORM_DATA: ClientFormData = {
  name: '',
  email: '',
  telephoneCountry: '+34',
  telephoneNumber: '',
  documentNumber: '',
  address: '',
  city: '',
  zipCode: '',
  country: '',
};

export type CreateClientPayload = Omit<
  Client,
  '_id' | 'companyId' | 'clientNumber' | 'createdAt'
>;

export interface ClientModalProps {
  isOpen: boolean;
  editingClient?: Client | null;
  onClose: () => void;
  onSaved: () => void;
  onCreate: (data: CreateClientPayload) => Promise<unknown>;
  onUpdate: (id: string, data: Partial<Client>) => Promise<unknown>;
}

const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

function clientToFormData(client: Client): ClientFormData {
  let telephoneCountry = '+34';
  let telephoneNumber = '';

  if (client.telephone) {
    const match = client.telephone.match(/^(\+\d{1,4})\s?(.*)$/);
    if (match) {
      telephoneCountry = match[1];
      telephoneNumber = match[2];
    } else {
      telephoneNumber = client.telephone;
    }
  }

  return {
    name: client.name || '',
    email: client.email || '',
    telephoneCountry,
    telephoneNumber,
    documentNumber: client.documentNumber || '',
    address: client.address?.street || '',
    city: client.address?.city || '',
    zipCode: client.address?.zipCode || '',
    country: client.address?.country || '',
  };
}

const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  editingClient,
  onClose,
  onSaved,
  onCreate,
  onUpdate,
}) => {
  const [formData, setFormData] = useState<ClientFormData>(DEFAULT_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [clientVehicles, setClientVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehiclePreviewUrl, setVehiclePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editingClient) {
      setFormData(clientToFormData(editingClient));
      fetchClientVehicles(editingClient._id);
    } else {
      setFormData(DEFAULT_FORM_DATA);
      setClientVehicles([]);
    }
  }, [isOpen, editingClient]);

  useEffect(() => {
    if (isOpen || isVehicleModalOpen) {
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
  }, [isOpen, isVehicleModalOpen]);

  const fetchClientVehicles = async (clientId: string) => {
    try {
      setLoadingVehicles(true);
      const response = await vehiclesApi.getVehicles({ clientId });
      setClientVehicles(response.vehicles || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleOpenVehicleModal = (vehicle?: Vehicle) => {
    setVehiclePreviewUrl(null);
    setEditingVehicle(vehicle ?? null);
    if (vehicle?.image?.url) setVehiclePreviewUrl(vehicle.image.url);
    setIsVehicleModalOpen(true);
  };

  const handleCloseVehicleModal = () => {
    if (vehiclePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(vehiclePreviewUrl);
    setIsVehicleModalOpen(false);
    setEditingVehicle(null);
    setVehiclePreviewUrl(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      if (name === 'telephoneNumber') {
        return { ...prev, [name]: value.replace(/[^0-9 ]/g, '') };
      }
      if (name === 'telephoneCountry') {
        let sanitized = value.replace(/[^+0-9]/g, '');
        if (!sanitized.startsWith('+')) sanitized = '+' + sanitized.replace(/^\+*/, '');
        if (sanitized === '') sanitized = '+';
        return { ...prev, [name]: sanitized };
      }
      if (['name', 'address', 'city', 'country'].includes(name)) {
        return { ...prev, [name]: capitalizeFirst(value) };
      }
      return { ...prev, [name]: value };
    });
  };

  const isFormValid = useMemo(() => {
    return (
      formData.name.trim() !== '' &&
      formData.documentNumber.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.telephoneNumber.trim() !== ''
    );
  }, [formData]);

  const hasChanges = useMemo(() => {
    if (!editingClient) return isFormValid;
    return (
      formData.name.trim() !== (editingClient.name || '') ||
      formData.email.toLowerCase().trim() !== (editingClient.email || '').toLowerCase() ||
      `${formData.telephoneCountry} ${formData.telephoneNumber}`.trim() !==
        (editingClient.telephone || '') ||
      formData.documentNumber.toUpperCase().trim() !==
        (editingClient.documentNumber || '') ||
      formData.address.trim() !== (editingClient.address?.street || '') ||
      formData.city.trim() !== (editingClient.address?.city || '') ||
      formData.zipCode.trim() !== (editingClient.address?.zipCode || '') ||
      formData.country.trim() !== (editingClient.address?.country || '')
    );
  }, [formData, editingClient, isFormValid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      const telephone = `${formData.telephoneCountry} ${formData.telephoneNumber}`.trim();
      const dataToSave = {
        name: capitalizeWords(formData.name),
        email: formData.email.toLowerCase().trim(),
        telephone,
        documentNumber: formData.documentNumber.toUpperCase().trim(),
        address: {
          street: capitalizeWords(formData.address),
          city: capitalizeWords(formData.city),
          zipCode: formData.zipCode.trim(),
          country: capitalizeWords(formData.country),
        },
      };

      if (editingClient) {
        await onUpdate(editingClient._id, dataToSave);
      } else {
        await onCreate({ ...dataToSave, active: true });
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el cliente';
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="gm-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="gm-modal-container gm-modal-container--large">
          {/* Header */}
          <div className="gm-modal-header">
            <div className="gm-modal-header-left">
              <div className="gm-modal-header-icon">
                <User size={22} />
              </div>
              <div className="gm-modal-header-meta">
                <h2 className="gm-modal-title">
                  {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h2>
                <p className="gm-modal-subtitle">
                  {editingClient
                    ? 'Gestiona los datos de contacto y facturación del cliente'
                    : 'Registra un nuevo cliente en el sistema'}
                </p>
              </div>
            </div>
            <button
              className="gm-modal-close-btn"
              onClick={onClose}
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="gm-modal-body">
              <div className="gm-modal-form-section">
                {/* Fila 1: Nombre + Documento */}
                <div className="gm-modal-form-row">
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label" htmlFor="cm-name">
                      Nombre Completo <span>*</span>
                    </label>
                    <input
                      type="text"
                      id="cm-name"
                      name="name"
                      className="gm-modal-input"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label" htmlFor="cm-documentNumber">
                      DNI / NIE / CIF <span>*</span>
                    </label>
                    <input
                      type="text"
                      id="cm-documentNumber"
                      name="documentNumber"
                      className="gm-modal-input"
                      value={formData.documentNumber}
                      onChange={handleInputChange}
                      placeholder="12345678X"
                      required
                    />
                  </div>
                </div>

                {/* Fila 2: Dirección + Ciudad */}
                <div className="gm-modal-form-row">
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label" htmlFor="cm-address">
                      Dirección (Calle, Nº, Piso...)
                    </label>
                    <input
                      type="text"
                      id="cm-address"
                      name="address"
                      className="gm-modal-input"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Ej: Calle Gran Vía, 1, 4ºA"
                    />
                  </div>
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label" htmlFor="cm-city">
                      Ciudad / Localidad
                    </label>
                    <input
                      type="text"
                      id="cm-city"
                      name="city"
                      className="gm-modal-input"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Madrid"
                    />
                  </div>
                </div>

                {/* Fila 3: CP + País */}
                <div className="gm-modal-form-row">
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label" htmlFor="cm-zipCode">
                      C.P.
                    </label>
                    <input
                      type="text"
                      id="cm-zipCode"
                      name="zipCode"
                      className="gm-modal-input"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="28013"
                    />
                  </div>
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label" htmlFor="cm-country">
                      País
                    </label>
                    <input
                      type="text"
                      id="cm-country"
                      name="country"
                      className="gm-modal-input"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="España"
                    />
                  </div>
                </div>

                {/* Fila 4: Email + Teléfono */}
                <div className="gm-modal-form-row">
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label" htmlFor="cm-email">
                      Email <span>*</span>
                    </label>
                    <input
                      type="email"
                      id="cm-email"
                      name="email"
                      className="gm-modal-input"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="ejemplo@correo.com"
                      required
                    />
                  </div>
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label" htmlFor="cm-telephoneNumber">
                      Teléfono <span>*</span>
                    </label>
                    <div className="client-modal-phone-row">
                      <input
                        type="text"
                        id="cm-telephoneCountry"
                        name="telephoneCountry"
                        className="gm-modal-input client-modal-input--country"
                        value={formData.telephoneCountry}
                        onChange={handleInputChange}
                        placeholder="+34"
                        autoComplete="tel-country-code"
                        required
                      />
                      <input
                        type="tel"
                        id="cm-telephoneNumber"
                        name="telephoneNumber"
                        className="gm-modal-input"
                        value={formData.telephoneNumber}
                        onChange={handleInputChange}
                        placeholder="600 000 000"
                        autoComplete="tel-local"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicles section — only in edit mode */}
              {editingClient && (
                <div className="client-modal-vehicles-section">
                  <div className="gm-modal-section-divider">
                    <span>Vehículos del Cliente</span>
                    <button
                      type="button"
                      className="client-modal-add-vehicle-btn"
                      onClick={() => handleOpenVehicleModal()}
                      title="Añadir nuevo vehículo"
                    >
                      <Plus size={16} />
                      Añadir
                    </button>
                  </div>
                  {/* <div className="client-modal-section-header-row"></div> */}

                  {loadingVehicles ? (
                    <div className="client-modal-vehicles-loading">
                      <div className="client-modal-mini-spinner" />
                      <span>Buscando vehículos...</span>
                    </div>
                  ) : clientVehicles.length > 0 ? (
                    <div className="client-modal-vehicles-grid">
                      {clientVehicles.map((v) => (
                        <div
                          key={v._id}
                          className="client-modal-vehicle-item-card client-modal-clickable"
                          onClick={() => handleOpenVehicleModal(v)}
                          title="Clic para editar vehículo"
                        >
                          <div className="client-modal-vehicle-card-content">
                            <div className="client-modal-vehicle-plate">{v.plate}</div>
                            <div className="client-modal-vehicle-info">
                              {v.brand} {v.model}
                            </div>
                          </div>
                          {v.image?.url && (
                            <div className="client-modal-vehicle-thumb-container">
                              <img
                                src={v.image.url}
                                alt={`${v.brand} ${v.model}`}
                                className="client-modal-vehicle-thumb"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="client-modal-no-vehicles-msg">
                      Este cliente aún no tiene vehículos registrados.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="gm-modal-footer">
              <button
                type="submit"
                className="gm-modal-btn gm-modal-btn-primary"
                disabled={submitting || !isFormValid || !hasChanges}
              >
                <Save size={18} />
                <span>
                  {submitting
                    ? editingClient
                      ? 'Actualizando...'
                      : 'Registrando...'
                    : editingClient
                      ? 'Actualizar'
                      : 'Registrar'}
                </span>
              </button>
              <button
                type="button"
                className="gm-modal-btn gm-modal-btn-secondary"
                onClick={onClose}
              >
                <X size={18} />
                <span>Cancelar</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Nested vehicle modal */}
      {isVehicleModalOpen && (
        <VehicleModal
          isOpen={isVehicleModalOpen}
          onClose={handleCloseVehicleModal}
          onSaved={() => editingClient && fetchClientVehicles(editingClient._id)}
          editingVehicle={editingVehicle}
          client={editingClient ?? null}
        />
      )}
    </>
  );
};

export default ClientModal;
