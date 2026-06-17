import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

import { getMenuItemsByRole } from '../../constants/navigation';
import { useUserData } from '../../context/UserContext/UserContext';

import './Sidebar.css';

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useUserData();
  const items = getMenuItemsByRole(user?.role);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button
          className="toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label="Toggle Sidebar"
          title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {isCollapsed ? <ChevronRight size={28} /> : <ChevronLeft size={28} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.id} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} className="nav-icon" />
                  {!isCollapsed && <span className="nav-label">{item.label}</span>}
                  {/*  {!isCollapsed && ( */}
                  <div className="active-indicator-wrapper">
                    <div className="active-indicator" />
                  </div>
                  {/*  )} */}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
