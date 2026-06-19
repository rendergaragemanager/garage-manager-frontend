import { X, Building2, Save, ImagePlus } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import {
  updateCompany,
  updateCompanyLogo,
} from '../../../services/api/companies.api';
import './CompanyModal.css';

const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyData: {
    id: string;
    name: string;
    document: string;
    phone: string;
    logoUrl?: string;
    address?: {
      street: string;
      city: string;
      zipCode: string;
      country: string;
    };
  };
}

const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  companyData,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    phonePrefix: '+34',
    phoneNumber: '',
    street: '',
    city: '',
    zipCode: '',
    country: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && companyData) {
      const fullPhone = companyData.phone || '';
      const prefixMatch = fullPhone.match(/^(\+\d{1,3})\s*(.*)$/);
      const prefix = prefixMatch ? prefixMatch[1] : '+34';
      const number = prefixMatch
        ? prefixMatch[2]
        : fullPhone.replace(/^\+\d{1,3}\s*/, '');

      const initialData = {
        name: companyData.name || '',
        document: companyData.document || '',
        phonePrefix: prefix,
        phoneNumber: number,
        street: companyData.address?.street || '',
        city: companyData.address?.city || '',
        zipCode: companyData.address?.zipCode || '',
        country: companyData.address?.country || '',
      };
      setFormData(initialData);
      setInitialFormData(initialData);
      setLogoFile(null);
      setLogoPreview(companyData.logoUrl || null);
    }
  }, [isOpen, companyData]);

  // Liberar el object URL de la preview cuando cambie o se cierre el modal
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  // Bloqueo de scroll del body
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

    if (name === 'phonePrefix') {
      let formattedValue = value;
      // Si el valor no empieza por +, se lo añadimos a la fuerza
      if (!formattedValue.startsWith('+')) {
        formattedValue = '+' + formattedValue.replace(/\+/g, '');
      }
      // Solo permitir números tras el +
      formattedValue = '+' + formattedValue.slice(1).replace(/\D/g, '');

      setFormData((prev) => ({ ...prev, [name]: formattedValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOGO_SIZE) {
      setError('⚠️ El logo es demasiado pesado (máximo 5MB).');
      e.target.value = '';
      return;
    }

    setError(null);
    setLogoFile(file);
    setLogoPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const fullPhone = `${formData.phonePrefix} ${formData.phoneNumber.trim()}`;
      await updateCompany(companyData.id, {
        name: formData.name,
        document: formData.document,
        phone: fullPhone,
        address: {
          street: formData.street,
          city: formData.city,
          zipCode: formData.zipCode,
          country: formData.country,
        },
      });

      // Si se seleccionó un nuevo logo, lo subimos (sustituye al anterior)
      if (logoFile) {
        const logoData = new FormData();
        logoData.append('logo', logoFile);
        await updateCompanyLogo(companyData.id, logoData);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al actualizar los datos de empresa';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const hasChanges =
    Boolean(logoFile) ||
    (initialFormData
      ? JSON.stringify(formData) !== JSON.stringify(initialFormData)
      : false);

  if (!isOpen) return null;

  return (
    <div
      className="gm-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="gm-modal-container">
        {/* Header */}
        <div className="gm-modal-header">
          <div className="gm-modal-header-left">
            <div className="gm-modal-header-icon">
              <Building2 size={22} />
            </div>
            <div className="gm-modal-header-meta">
              <h2 className="gm-modal-title">Editar Información de Empresa</h2>
              <p className="gm-modal-subtitle">
                Actualiza los datos fiscales y de contacto del taller
              </p>
            </div>
          </div>
          <button className="gm-modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="gm-modal-form">
          <div className="gm-modal-body">
            {error && <div className="company-modal-error">{error}</div>}

            <div className="gm-modal-form-section">
              <div className="gm-modal-form-group">
                <label className="gm-modal-label">Logo de la Empresa</label>
                <div className="company-modal-logo">
                  <div className="company-modal-logo-preview">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo de la empresa" />
                    ) : (
                      <Building2 size={28} />
                    )}
                  </div>
                  <label className="company-modal-logo-upload">
                    <ImagePlus size={18} />
                    <span>{logoPreview ? 'Cambiar logo' : 'Subir logo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleLogoChange}
                      hidden
                    />
                  </label>
                </div>
                <p className="company-modal-logo-hint">
                  Aparecerá en presupuestos y albaranes. PNG, JPG o WEBP (máx. 5MB).
                </p>
              </div>

              <div className="gm-modal-form-group">
                <label className="gm-modal-label">Nombre Comercial</label>
                <input
                  type="text"
                  name="name"
                  className="gm-modal-input"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: Talleres Mecánicos SL"
                />
              </div>

              <div className="gm-modal-form-row">
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">CIF / NIF</label>
                  <input
                    type="text"
                    name="document"
                    className="gm-modal-input"
                    value={formData.document}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: B12345678"
                  />
                </div>
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

              <div className="gm-modal-section-divider">
                <span>Dirección Fiscal</span>
              </div>

              <div className="gm-modal-form-group">
                <label className="gm-modal-label">Calle y Número</label>
                <input
                  type="text"
                  name="street"
                  className="gm-modal-input"
                  value={formData.street}
                  onChange={handleInputChange}
                  placeholder="Ej: Calle Mayor 1"
                />
              </div>

              <div className="gm-modal-form-row">
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">Ciudad</label>
                  <input
                    type="text"
                    name="city"
                    className="gm-modal-input"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Ej: Madrid"
                  />
                </div>
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">Código Postal</label>
                  <input
                    type="text"
                    name="zipCode"
                    className="gm-modal-input"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    placeholder="Ej: 28001"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="gm-modal-footer">
            <button
              type="submit"
              className="gm-modal-btn gm-modal-btn-primary"
              disabled={submitting || !hasChanges}
            >
              <Save size={18} />
              <span>{submitting ? 'Actualizando...' : 'Actualizar'}</span>
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

export default CompanyModal;
