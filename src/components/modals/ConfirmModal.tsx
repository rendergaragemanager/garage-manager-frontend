import React from 'react';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  confirmClassName?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
  confirmClassName = '',
  icon,
  iconClassName = '',
}) => {
  const getIconVariant = (className: string) => {
    if (className.includes('success') || className.includes('accept'))
      return 'gm-modal-icon-center--success';
    if (
      className.includes('danger') ||
      className.includes('reject') ||
      className.includes('deactivate')
    )
      return 'gm-modal-icon-center--danger';
    if (className.includes('warning') || className.includes('deliver'))
      return 'gm-modal-icon-center--warning';
    return '';
  };

  const getButtonVariant = (className: string) => {
    const iconVariant = getIconVariant(className);
    if (iconVariant.includes('danger')) return 'gm-modal-btn-danger';
    if (iconVariant.includes('warning')) return 'gm-modal-btn-warning';
    return 'gm-modal-btn-primary';
  };

  if (!isOpen) return null;

  return (
    <div
      className="gm-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="gm-modal-container gm-modal-container--small"
        style={{ textAlign: 'center' }}
      >
        <div className="gm-modal-body">
          {icon && (
            <div
              className={`gm-modal-icon-center ${getIconVariant(iconClassName)}`.trim()}
            >
              {React.cloneElement(icon as React.ReactElement<{ size?: number }>, {
                size: 42,
              })}
            </div>
          )}
          <h2
            className="gm-modal-title"
            style={{ marginBottom: '12px', fontSize: '1.5rem' }}
          >
            {title}
          </h2>
          {description && (
            <p
              style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6', margin: 0 }}
            >
              {description}
            </p>
          )}
        </div>
        <div className="gm-modal-footer gm-modal-footer--confirm">
          <button
            className="gm-modal-btn gm-modal-btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={`gm-modal-btn ${getButtonVariant(confirmClassName)}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
