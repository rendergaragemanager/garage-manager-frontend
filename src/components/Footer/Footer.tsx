import { Mail, Phone, Settings, ShieldCheck } from 'lucide-react';
import './Footer.css';
import { useLocation } from 'react-router-dom';

const Footer = () => {
  const { pathname } = useLocation();
  const isLoginPage = pathname === '/login';
  const currentYear = new Date().getFullYear();

  const handleOpenLink = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    window.open(path, '_blank', 'noopener,noreferrer');
  };

  if (isLoginPage) {
    return (
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; {currentYear} Garage Manager. Todos los derechos reservados.</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-logo">
              <img
                src="/logos/Logo.png"
                alt="Garage Manager Logo"
                className="logo-icon"
              />
              <span className="logo-text">Garage Manager</span>
            </div>
            <div className="footer-info">
              <p className="footer-tagline">
                Gestión profesional para talleres modernos.
              </p>
              <p className="footer-copyright-top">
                &copy; <span className="year-highlight">{currentYear}</span> Todos los
                derechos reservados.
              </p>
            </div>
          </div>

          <div className="footer-column">
            <h4>Contacto</h4>
            <ul>
              <li>
                <a href="mailto:rendergaragemanager@gmail.com">
                  <Mail size={14} /> rendergaragemanager@gmail.com
                </a>
              </li>
              <li>
                <span>
                  <Phone size={14} /> Teléfono no disponible por el momento
                </span>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Legal</h4>
            <ul>
              <li>
                <a
                  href="/politica-privacidad"
                  onClick={(e) => handleOpenLink(e, '/politica-privacidad')}
                >
                  Política de privacidad
                </a>
              </li>
              <li>
                <a
                  href="/politica-cookies"
                  onClick={(e) => handleOpenLink(e, '/politica-cookies')}
                >
                  Política de cookies
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Seguridad</h4>
            <ul>
              <li>
                <span className="security-item">
                  <ShieldCheck size={14} /> Datos encriptados
                </span>
              </li>
              <li>
                <span className="security-item">
                  <Settings size={14} /> v1.0.0
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-scanner-full">
        <div className="scanner-kitt-bar"></div>
        <div className="scanner-text-container">
          <span className="scanner-text">tools for the real world</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
