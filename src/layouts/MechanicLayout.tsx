import { Outlet } from 'react-router-dom';

import Header from '../components/Header/Header';
import MechanicNav from '../components/mechanic/MechanicNav/MechanicNav';
import './MechanicLayout.css';

const MechanicLayout = () => {
  return (
    <div className="mechanic-layout">
      <Header />

      <main className="mechanic-content">
        <Outlet />
      </main>

      <MechanicNav />
    </div>
  );
};

export default MechanicLayout;
