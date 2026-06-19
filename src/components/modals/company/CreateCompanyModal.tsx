import { X, Building2, Save } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import './CompanyModal.css';

export interface CreateCompanyData {
  name: string;
  email: string;
  password?: string;
  companyName: string;
  companyDocument: string;
  companyPhone: string;
  companyAddress: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
}

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  onCreate: (data: CreateCompanyData) => Promise<unknown>;
}

function buildDefaultFormData() {
  return {
    name: '',
    email: '',
    password: '',
    companyName: '',
    companyDocument: '',
    phonePrefix: '+34',
    phoneNumber: '',
    companyAddressStreet: '',
    companyAddressCity: '',
    companyAddressZipCode: '',
    companyAddressCountry: 'España',
  };
}

const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  onCreate,
}) => {
  const [formData, setFormData] = useState(buildDefaultFormData());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(buildDefaultFormData());
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'password') setError(null);

    if (name === 'phonePrefix') {
      let formattedValue = value;
      if (!formattedValue.startsWith('+')) {
        formattedValue = '+' + formattedValue.replace(/\+/g, '');
      }
      formattedValue = '+' + formattedValue.slice(1).replace(/\D/g, '');
      setFormData((prev) => ({ ...prev, [name]: formattedValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password.trim().length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      setSubmitting(true);
      const fullPhone = `${formData.phonePrefix} ${formData.phoneNumber.trim()}`;
      await onCreate({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
        companyDocument: formData.companyDocument,
        companyPhone: fullPhone,
        companyAddress: {
          street: formData.companyAddressStreet,
          city: formData.companyAddressCity,
          zipCode: formData.companyAddressZipCode,
          country: formData.companyAddressCountry,
        },
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear la empresa';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="gm-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="gm-modal-container gm-modal-container--large">
        <div className="gm-modal-header">
          <div className="gm-modal-header-left">
            <div className="gm-modal-header-icon">
              <Building2 size={22} />
            </div>
            <div className="gm-modal-header-meta">
              <h2 className="gm-modal-title">Nueva Empresa</h2>
              <p className="gm-modal-subtitle">
                Registra un nuevo taller y su administrador
              </p>
            </div>
          </div>
          <button className="gm-modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="gm-modal-form">
          <div className="gm-modal-body">
            {error && <div className="company-modal-error">{error}</div>}

            {/* Información de la Empresa */}
            <div className="gm-modal-form-section">
              <div className="gm-modal-section-divider">
                <span>Información de la Empresa</span>
              </div>

              <div className="gm-modal-form-row">
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">Nombre Comercial</label>
                  <input
                    name="companyName"
                    className="gm-modal-input"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: Talleres Mecánicos SL"
                  />
                </div>
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">CIF / NIF</label>
                  <input
                    name="companyDocument"
                    className="gm-modal-input"
                    value={formData.companyDocument}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: B12345678"
                  />
                </div>
              </div>

              <div className="gm-modal-form-row">
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">Teléfono</label>
                  <div className="company-modal-phone-group">
                    <input
                      type="text"
                      name="phonePrefix"
                      className="gm-modal-input company-modal-phone-prefix"
                      value={formData.phonePrefix}
                      onChange={handleInputChange}
                      placeholder="+34"
                    />
                    <input
                      type="text"
                      name="phoneNumber"
                      className="gm-modal-input"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      required
                      placeholder="600 000 000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dirección Fiscal */}
            <div className="gm-modal-form-section">
              <div className="gm-modal-section-divider">
                <span>Dirección Fiscal</span>
              </div>

              <div className="gm-modal-form-group">
                <label className="gm-modal-label">Calle y Número</label>
                <input
                  name="companyAddressStreet"
                  className="gm-modal-input"
                  value={formData.companyAddressStreet}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: Calle Mayor 1"
                />
              </div>

              <div className="gm-modal-form-row">
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">Ciudad</label>
                  <input
                    name="companyAddressCity"
                    className="gm-modal-input"
                    value={formData.companyAddressCity}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: Madrid"
                  />
                </div>
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">Código Postal</label>
                  <input
                    name="companyAddressZipCode"
                    className="gm-modal-input"
                    value={formData.companyAddressZipCode}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: 28001"
                  />
                </div>
              </div>

              <div className="gm-modal-form-row">
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">País</label>
                  <input
                    name="companyAddressCountry"
                    className="gm-modal-input"
                    value={formData.companyAddressCountry}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: España"
                  />
                </div>
              </div>
            </div>

            {/* Datos del Administrador */}
            <div className="gm-modal-form-section">
              <div className="gm-modal-section-divider">
                <span>Datos del Administrador</span>
              </div>

              <div className="gm-modal-form-row">
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">Nombre Completo</label>
                  <input
                    name="name"
                    className="gm-modal-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: Juan Pérez Domínguez"
                  />
                </div>
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">Email</label>
                  <input
                    name="email"
                    type="email"
                    className="gm-modal-input"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: admin@taller.com"
                  />
                </div>
              </div>

              <div className="gm-modal-form-row">
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">Contraseña</label>
                  <input
                    name="password"
                    type="password"
                    className="gm-modal-input"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="gm-modal-footer">
            <button
              type="submit"
              className="gm-modal-btn gm-modal-btn-primary"
              disabled={submitting}
            >
              <Save size={18} />
              <span>{submitting ? 'Creando...' : 'Crear Empresa'}</span>
            </button>
            <button
              type="button"
              className="gm-modal-btn gm-modal-btn-secondary"
              onClick={onClose}
              disabled={submitting}
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

export default CreateCompanyModal;
