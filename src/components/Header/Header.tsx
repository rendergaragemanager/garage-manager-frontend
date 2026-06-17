import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';

import { getMenuItemsByRole } from '../../constants/navigation';
import { useUserActions, useUserData } from '../../context/UserContext/UserContext';

import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const { user } = useUserData();
  const { logout } = useUserActions();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const items = getMenuItemsByRole(user?.role);

  const userName = user?.name ?? 'ADMINISTRADOR';
  const userCompany = user?.companyName ?? 'Garage Manager';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <div className="header-brand" onClick={() => navigate('/app/inicio')}>
            <img className="logo" src="/logos/Logo.png" alt="Logo Garage Manager" />
            <span className="logo-title">Garage Manager</span>
          </div>

          {user?.role !== 'MECHANIC' && (
            <button
              className="mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
              title={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>

        <div className="user-section">
          <div className="user-details">
            <span className="user-name">{userName}</span>
            <span className="user-company">{userCompany}</span>
          </div>

          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            <span className="logout-text">Salir</span>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <nav className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="mobile-nav-list">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id} className="mobile-nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? 'active' : ''}`
                  }
                  onClick={closeMobileMenu}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
