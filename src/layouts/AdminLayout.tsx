import { Outlet } from 'react-router-dom';

import Footer from '../components/Footer/Footer';
import Header from '../components/Header/Header';
import Sidebar from '../components/Sidebar/Sidebar';
import './AdminLayout.css';

const AdminLayout = () => {
  return (
    <div className="admin-layout-container">
      <Header />
      <div className="admin-main-wrapper">
        <Sidebar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default AdminLayout;
