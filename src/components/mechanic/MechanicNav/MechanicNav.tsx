import { Wrench, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import './MechanicNav.css';

const MechanicNav = () => {
  return (
    <nav className="mechanic-nav">
      <NavLink
        to="/app/ordenes-trabajo"
        end
        className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
      >
        <Wrench size={24} strokeWidth={2} />
        <span>Mis Órdenes</span>
      </NavLink>

      <NavLink
        to="/app/mi-perfil"
        className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
      >
        <User size={24} strokeWidth={2} />
        <span>Mi Perfil</span>
      </NavLink>
    </nav>
  );
};

export default MechanicNav;
