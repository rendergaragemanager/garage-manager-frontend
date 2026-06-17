import { Home, Users, FileText, ClipboardList, Car, User, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { UserRole } from '../context/UserContext/types';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

export const menuItems: MenuItem[] = [
  { id: 'inicio', label: 'Inicio', icon: Home, path: '/app/inicio' },
  { id: 'clientes', label: 'Clientes', icon: Users, path: '/app/clientes' },
  {
    id: 'presupuestos',
    label: 'Presupuestos',
    icon: FileText,
    path: '/app/presupuestos',
  },
  { id: 'albaranes', label: 'Albaranes', icon: ClipboardList, path: '/app/albaranes' },
  { id: 'vehiculos', label: 'Vehículos', icon: Car, path: '/app/vehiculos' },
  { id: 'usuarios', label: 'Usuarios', icon: Users, path: '/app/usuarios' },
  { id: 'perfil', label: 'Mi Perfil', icon: User, path: '/app/mi-perfil' },
];

export const getMenuItemsByRole = (role?: UserRole | null): MenuItem[] => {
  if (role === 'SUPER_ADMIN') {
    return [
      { id: 'inicio', label: 'Inicio', icon: Home, path: '/app/inicio' },
      { id: 'empresas', label: 'Empresas', icon: Building2, path: '/app/empresas' },
      { id: 'perfil', label: 'Mi Perfil', icon: User, path: '/app/mi-perfil' },
    ];
  }

  if (role === 'MECHANIC') {
    return [
      {
        id: 'ordenes',
        label: 'Mis Órdenes',
        icon: ClipboardList,
        path: '/app/ordenes-trabajo',
      },
      { id: 'perfil', label: 'Mi Perfil', icon: User, path: '/app/mi-perfil' },
    ];
  }

  if (role === 'ADMINISTRATIVE') {
    return menuItems.map((item) =>
      item.id === 'usuarios' ? { ...item, label: 'Mecánicos' } : item,
    );
  }

  // ADMIN: menú completo
  return menuItems;
};
