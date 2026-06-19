import { X, User, Save } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';

import type { User as UserType } from '../../../types/user.types';
import './UserModal.css';

type CreatableUserRole = 'ADMIN' | 'ADMINISTRATIVE' | 'MECHANIC';

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: CreatableUserRole;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password?: string;
  role: CreatableUserRole;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: CreatableUserRole;
}

export interface UserModalProps {
  isOpen: boolean;
  editingUser?: UserType | null;
  onClose: () => void;
  onSaved: () => void;
  onCreate: (data: CreateUserPayload) => Promise<unknown>;
  onUpdate: (id: string, data: UpdateUserPayload) => Promise<unknown>;
}

function buildDefaultFormData(): UserFormData {
  return {
    name: '',
    email: '',
    password: '',
    role: 'MECHANIC',
  };
}

function userToFormData(user: UserType): UserFormData {
  const role: CreatableUserRole =
    user.role === 'ADMINISTRATIVE' || user.role === 'MECHANIC' || user.role === 'ADMIN'
      ? (user.role as CreatableUserRole)
      : 'MECHANIC';

  return {
    name: user.name || '',
    email: user.email || '',
    password: '',
    role,
  };
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  editingUser,
  onClose,
  onSaved,
  onCreate,
  onUpdate,
}) => {
  const [formData, setFormData] = useState<UserFormData>(buildDefaultFormData());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingUser) {
      setFormData(userToFormData(editingUser));
    } else {
      setFormData(buildDefaultFormData());
    }
  }, [isOpen, editingUser]);

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

  const hasChanges = useMemo(() => {
    if (!editingUser) {
      return (
        formData.name.trim() !== '' &&
        formData.email.trim() !== '' &&
        formData.password?.trim() !== ''
      );
    }

    return (
      formData.name !== (editingUser.name || '') ||
      formData.email !== (editingUser.email || '') ||
      formData.password?.trim() !== '' ||
      formData.role !== (editingUser.role || '')
    );
  }, [formData, editingUser]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === 'password') setError(null);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedPassword = formData.password?.trim() ?? '';

    // La contraseña es obligatoria al crear; al editar solo se valida si se escribe.
    if ((!editingUser || normalizedPassword !== '') && normalizedPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      setSubmitting(true);

      if (editingUser) {
        const updateData: UpdateUserPayload = {
          name: formData.name,
          email: formData.email,
          ...(normalizedPassword ? { password: normalizedPassword } : {}),
          role: formData.role,
        };
        await onUpdate(editingUser._id, updateData);
      } else {
        const createData: CreateUserPayload = {
          name: formData.name,
          email: formData.email,
          password: normalizedPassword,
          role: formData.role,
        };
        await onCreate(createData);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el usuario';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = editingUser ? 'Editar Usuario' : 'Nuevo Usuario';
  const saveLabel = submitting
    ? 'Guardando...'
    : editingUser
      ? 'Actualizar'
      : 'Registrar';

  if (!isOpen) return null;

  return (
    <div
      className="gm-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="gm-modal-container">
        <div className="gm-modal-header">
          <div className="gm-modal-header-left">
            <div className="gm-modal-header-icon">
              <User size={22} />
            </div>
            <div className="gm-modal-header-meta">
              <h2 className="gm-modal-title">{modalTitle}</h2>
              <p className="gm-modal-subtitle">
                {editingUser
                  ? 'Modifica los datos de acceso y perfil'
                  : 'Crea una nueva cuenta de acceso'}
              </p>
            </div>
          </div>
          <button className="gm-modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="gm-modal-body">
          <form id="user-form" onSubmit={handleSubmit}>
            {error && <div className="user-modal-error">{error}</div>}
            <div className="gm-modal-form-section">
              <div className="gm-modal-section-divider">
                <span>Datos de Acceso</span>
              </div>
              <div className="user-modal-form-grid">
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">Nombre Completo</label>
                  <input
                    name="name"
                    className="gm-modal-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: Juan Pérez"
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
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div className="gm-modal-form-group">
                  <label className="gm-modal-label">
                    Contraseña {editingUser && '(opcional)'}
                  </label>
                  <input
                    name="password"
                    type="password"
                    className="gm-modal-input"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingUser}
                    placeholder={editingUser ? '••••••••' : 'Mínimo 8 caracteres'}
                  />
                </div>
                {editingUser?.role !== 'ADMIN' && (
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label">Rol del Usuario</label>
                    <select
                      name="role"
                      className="gm-modal-input"
                      value={formData.role}
                      onChange={handleInputChange}
                    >
                      <option value="MECHANIC">Mecánico</option>
                      <option value="ADMINISTRATIVE">Administrativo</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="gm-modal-footer">
          <button
            type="submit"
            form="user-form"
            className="gm-modal-btn gm-modal-btn-primary"
            disabled={submitting || !hasChanges}
          >
            <Save size={18} />
            <span>{saveLabel}</span>
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
      </div>
    </div>
  );
};

export default UserModal;
