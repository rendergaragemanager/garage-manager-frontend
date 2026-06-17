import { X, BarChart3, TrendingUp, DollarSign, Clock, FileText } from 'lucide-react';
import React, { useEffect } from 'react';

import type { User } from '../../../types/user.types';
import type { WorkOrder, WorkOrderStatus } from '../../../types/workOrder.types';
import './MechanicMetricsModal.css';

interface MechanicMetrics {
  completedCount: number;
  deliveredCount: number;
  deliveredTotal: number;
  assignedCount: number;
}

interface MechanicMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  metrics: MechanicMetrics | null;
  loading: boolean;
  recentWorkOrders: WorkOrder[];
  onWorkOrderClick?: (orderId: string) => void;
}

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  PENDING: 'Pend. asignación',
  ASSIGNED: 'Asignada',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Pend. entrega',
  CANCELLED: 'Cancelada',
  DELIVERED: 'Finalizada',
};

const MechanicMetricsModal: React.FC<MechanicMetricsModalProps> = ({
  isOpen,
  onClose,
  user,
  metrics,
  loading,
  recentWorkOrders,
  onWorkOrderClick,
}) => {
  // Bloquear scroll del body al abrir el modal (consistente con otros modales)
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

  if (!isOpen || !user) return null;

  const performance =
    metrics && metrics.assignedCount > 0
      ? Math.round((metrics.completedCount / metrics.assignedCount) * 100)
      : 0;

  return (
    <div
      className="gm-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="gm-modal-container gm-modal-container--large">
        <div className="gm-modal-header">
          <div className="gm-modal-header-left">
            <div className="gm-modal-header-icon">
              <BarChart3 size={20} />
            </div>
            <div className="gm-modal-header-meta">
              <h2 className="gm-modal-title">Rendimiento del Mecánico</h2>
              <p className="gm-modal-subtitle">Estadísticas y actividad reciente</p>
            </div>
          </div>
          <button className="gm-modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="gm-modal-body">
          <div className="metrics-user-card">
            <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <h4>{user.name}</h4>
              <p>{user.email}</p>
            </div>
            <div className="status-badge active">Activo</div>
          </div>

          {loading ? (
            <div className="metrics-loading">
              <div className="spinner"></div>
              <p>Analizando rendimiento...</p>
            </div>
          ) : (
            <>
              <div className="metrics-stats-grid">
                <div className="stat-card">
                  <div className="stat-icon blue">
                    <FileText size={18} />
                  </div>
                  <div className="stat-data">
                    <span className="stat-label">Completadas</span>
                    <span className="stat-value">{metrics?.completedCount || 0}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon green">
                    <TrendingUp size={18} />
                  </div>
                  <div className="stat-data">
                    <span className="stat-label">Rendimiento</span>
                    <span className="stat-value">{performance}%</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon amber">
                    <DollarSign size={18} />
                  </div>
                  <div className="stat-data">
                    <span className="stat-label">Facturación</span>
                    <span className="stat-value">
                      {(metrics?.deliveredTotal || 0).toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon purple">
                    <Clock size={18} />
                  </div>
                  <div className="stat-data">
                    <span className="stat-label">Asignadas</span>
                    <span className="stat-value">{metrics?.assignedCount || 0}</span>
                  </div>
                </div>
              </div>

              <div className="activity-section">
                <div className="gm-modal-section-divider">
                  <span>Actividad Reciente</span>
                </div>

                <div className="activity-scroll-area">
                  {recentWorkOrders.length === 0 ? (
                    <div className="no-activity">
                      <p>Este mecánico no tiene actividad registrada recientemente.</p>
                    </div>
                  ) : (
                    recentWorkOrders.map((order) => (
                      <div
                        key={order._id}
                        className={`activity-row ${onWorkOrderClick ? 'clickable' : ''}`}
                        onClick={() => onWorkOrderClick?.(order._id)}
                      >
                        <div className="activity-indicator"></div>
                        <div className="activity-content">
                          <div className="activity-top">
                            <span className="order-num">
                              # {order.workOrderNumber || ' ---'}
                            </span>
                            <span
                              className={`status-badge ${order.status.toLowerCase()}`}
                            >
                              {STATUS_LABELS[order.status]}
                            </span>
                          </div>
                          <p className="order-desc">{order.description}</p>
                        </div>
                        <div className="activity-meta">
                          <Clock size={10} />
                          {new Date(order.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="gm-modal-footer">
          <button className="gm-modal-btn gm-modal-btn-secondary" onClick={onClose}>
            <X size={18} />
            <span>Cerrar Panel</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MechanicMetricsModal;
