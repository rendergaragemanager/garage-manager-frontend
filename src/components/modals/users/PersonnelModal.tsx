import { X, Users, Pencil, UserX, UserCheck } from 'lucide-react';
import React, { useEffect } from 'react';

import type { Company } from '../../../types/company.types';
import type { User } from '../../../types/user.types';
import { DataList } from '../../DataList/DataList';
import type { ColumnDef, RowAction } from '../../DataList/DataList';
import FilterStats from '../../FilterStats/FilterStats';
import type { FilterStatsItem } from '../../FilterStats/FilterStats';

import './PersonnelModal.css';

export type PersonnelRoleFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

interface PersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** La empresa cuyo personal se está visualizando */
  selectedCompany: Company | null;
  personnelUsers: User[];
  activeFilter: PersonnelRoleFilter;
  onFilterChange: (filter: PersonnelRoleFilter) => void;
  columns: ColumnDef<User>[];
  /** Callback para editar un usuario (abre UserModal) */
  onEditUser: (user: User) => void;
  /** Callback para activar/desactivar un usuario (abre ConfirmModal) */
  onToggleUser: (user: User, type: 'ACTIVATE' | 'DEACTIVATE') => void;
}

const PersonnelModal: React.FC<PersonnelModalProps> = ({
  isOpen,
  onClose,
  selectedCompany,
  personnelUsers,
  activeFilter,
  onFilterChange,
  columns,
  onEditUser,
  onToggleUser,
}) => {
  // Bloquea el scroll del body mientras el modal está abierto
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !selectedCompany) return null;

  const roleOrder: Record<string, number> = { ADMIN: 0, ADMINISTRATIVE: 1, MECHANIC: 2 };

  const filteredUsers = personnelUsers
    .filter((u) => {
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'ACTIVE') return u.active;
      if (activeFilter === 'INACTIVE') return !u.active;
      return true;
    })
    .sort((a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99));

  const statsItems: FilterStatsItem[] = [
    {
      key: 'active',
      label: 'Activos',
      count: personnelUsers.filter((u) => u.active).length,
      colors: {
        background: '#0d201a',
        border: 'rgba(16, 185, 129, 0.45)',
        text: '#34d399',
        hoverBorder: 'rgba(16, 185, 129, 0.75)',
        activeBorder: '#34d399',
        activeRing: 'rgba(52, 211, 153, 0.35)',
      },
      isActive: activeFilter === 'ACTIVE',
      onClick: () => onFilterChange('ACTIVE'),
    },
    {
      key: 'inactive',
      label: 'Inactivos',
      count: personnelUsers.filter((u) => !u.active).length,
      colors: {
        background: '#20130f',
        border: 'rgba(239, 68, 68, 0.45)',
        text: '#f87171',
        hoverBorder: 'rgba(239, 68, 68, 0.75)',
        activeBorder: '#f87171',
        activeRing: 'rgba(248, 113, 113, 0.35)',
      },
      isActive: activeFilter === 'INACTIVE',
      onClick: () => onFilterChange('INACTIVE'),
    },
    {
      key: 'all',
      label: 'Total',
      count: personnelUsers.length,
      isActive: activeFilter === 'ALL',
      onClick: () => onFilterChange('ALL'),
    },
  ];

  const personnelActions: RowAction<User>[] = [
    {
      key: 'edit',
      icon: <Pencil size={16} />,
      label: 'Editar usuario',
      onClick: (u: User) => onEditUser(u),
      show: (u: User) => u.active,
    },
    {
      key: 'deactivate',
      icon: <UserX size={16} />,
      label: 'Desactivar usuario',
      onClick: (u: User) => onToggleUser(u, 'DEACTIVATE'),
      show: (u: User) => u.active,
    },
    {
      key: 'activate',
      icon: <UserCheck size={16} />,
      label: 'Activar usuario',
      onClick: (u: User) => onToggleUser(u, 'ACTIVATE'),
      show: (u: User) => !u.active,
    },
  ];

  return (
    <div
      className="gm-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="gm-modal-container gm-modal-container--large">
        <div className="gm-modal-header">
          <div className="gm-modal-header-left">
            <div className="gm-modal-header-icon">
              <Users size={22} />
            </div>
            <div className="gm-modal-header-meta">
              <h2 className="gm-modal-title">Personal de Empresa</h2>
              <p className="gm-modal-subtitle">{selectedCompany.name}</p>
            </div>
          </div>
          <button className="gm-modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="gm-modal-body">
          <div className="personnel-modal-stats">
            <FilterStats items={statsItems} />
          </div>
          <div className="personnel-modal-list">
            <DataList
              columns={columns}
              data={filteredUsers}
              actions={personnelActions}
              onRowClick={(u) => onEditUser(u)}
              rowKey={(u) => u._id}
              variant="dark"
              actionsAlign="right"
              gridTemplateAreas={{
                base: `"user status" "role actions"`,
                tablet: `"user role status actions"`,
                desktop: `"user role status actions"`,
              }}
              gridTemplateColumns="1.8fr 1fr 130px 80px"
              emptyMessage="No hay personal que coincida con el filtro."
              rowClassName={(u) => (!u.active ? 'dl-row--inactive' : '')}
            />
          </div>
        </div>

        <div className="gm-modal-footer">
          <button
            type="button"
            className="gm-modal-btn gm-modal-btn-secondary"
            onClick={onClose}
          >
            <X size={18} />
            <span>Cerrar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonnelModal;
