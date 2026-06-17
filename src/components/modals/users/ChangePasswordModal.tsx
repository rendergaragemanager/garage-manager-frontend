import { X, Key, Save, CheckCircle, XCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { updateUser } from '../../../services/api/users.api';
import './UserModal.css';

export interface ChangePasswordModalProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  userId,
  onClose,
  onSaved,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
  }, [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (!currentPassword) {
      setError('Debes introducir tu contraseña actual.');
      return;
    }

    try {
      setSubmitting(true);
      await updateUser(userId, { password: newPassword, currentPassword });
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al cambiar la contraseña';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasChanges =
    newPassword.length > 0 || confirmPassword.length > 0 || currentPassword.length > 0;

  if (!isOpen) return null;

  return (
    <div
      className="gm-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="gm-modal-container gm-modal-container--small">
        <div className="gm-modal-header">
          <div className="gm-modal-header-left">
            <div className="gm-modal-header-icon">
              <Key size={22} />
            </div>
            <div className="gm-modal-header-meta">
              <h2 className="gm-modal-title">Cambiar Contraseña</h2>
              <p className="gm-modal-subtitle">Establece una nueva clave de acceso</p>
            </div>
          </div>
          <button className="gm-modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="gm-modal-body">
          {success ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '40px 20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <CheckCircle size={32} color="#22c55e" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '1.2rem' }}>
                ¡Contraseña Actualizada!
              </h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
                Tus datos se han guardado correctamente.
              </p>
            </div>
          ) : (
            <form id="password-form" onSubmit={handleSubmit}>
              {error && (
                <div
                  className="profile-error-banner"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'center',
                  }}
                >
                  <XCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="gm-modal-form-section">
                <div
                  className="user-modal-form-grid"
                  style={{ gridTemplateColumns: '1fr' }}
                >
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label">Contraseña Actual</label>
                    <input
                      name="currentPassword"
                      type="password"
                      className="gm-modal-input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="Introduce tu contraseña actual"
                    />
                  </div>
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label">Nueva Contraseña</label>
                    <input
                      name="newPassword"
                      type="password"
                      className="gm-modal-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                  <div className="gm-modal-form-group">
                    <label className="gm-modal-label">Confirmar Contraseña</label>
                    <input
                      name="confirmPassword"
                      type="password"
                      className="gm-modal-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Repite la contraseña"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {!success && (
          <div className="gm-modal-footer">
            <button
              type="submit"
              form="password-form"
              className="gm-modal-btn gm-modal-btn-primary"
              disabled={submitting || !hasChanges}
            >
              <Save size={18} />
              <span>{submitting ? 'Guardando...' : 'Actualizar'}</span>
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
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;
