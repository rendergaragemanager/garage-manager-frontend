import {
  ArrowLeft,
  Cookie,
  Shield,
  Info,
  Settings,
  Trash2,
  RefreshCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './CookiesPolicy.css';

const CookiesPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="cookies-policy-container">
      <div className="cookies-policy-overlay" />

      <main className="cookies-policy-content">
        <button
          className="back-button"
          onClick={() => navigate(-1)}
          aria-label="Volver atrás"
        >
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>

        <header className="policy-header">
          <div className="icon-wrapper">
            <Cookie size={40} className="header-icon" />
          </div>
          <h1>Política de Cookies</h1>
          <p className="last-updated">Última actualización: Abril 2026</p>
        </header>

        <section className="policy-section">
          <h2>
            <Info size={24} />
            1. ¿Qué son las cookies?
          </h2>
          <p>
            Las cookies son pequeños archivos de texto que un sitio web almacena en su
            navegador cuando lo visita. Sirven para permitir el funcionamiento técnico de
            la web, recordar preferencias o recopilar información sobre el uso del sitio.
          </p>
        </section>

        <section className="policy-section">
          <h2>
            <Shield size={24} />
            2. ¿Qué tipos de cookies utiliza esta web?
          </h2>
          <p>Este sitio web puede utilizar las siguientes categorías de cookies:</p>
          <ul className="info-list">
            <li>
              <strong>Cookies técnicas o necesarias:</strong> imprescindibles para el
              funcionamiento de la web (inicio de sesión, seguridad, etc.).
            </li>
            <li>
              <strong>Cookies de preferencias o personalización:</strong> permiten
              recordar información como el idioma o la configuración regional.
            </li>
            <li>
              <strong>Cookies de análisis o medición:</strong> permiten cuantificar el
              número de usuarios y realizar análisis estadísticos del uso del sitio.
            </li>
            <li>
              <strong>Cookies de publicidad comportamental:</strong> analizan los hábitos
              de navegación para mostrar publicidad personalizada.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>
            <Cookie size={24} />
            3. Cookies utilizadas en este sitio
          </h2>
          <div className="table-wrapper">
            <table className="cookies-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Finalidad</th>
                  <th>Duración</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>session_token</td>
                  <td>Técnica</td>
                  <td>Mantiene la sesión del usuario activa</td>
                  <td>Sesión</td>
                </tr>
                <tr>
                  <td>user_pref</td>
                  <td>Preferencia</td>
                  <td>Guarda preferencias de interfaz</td>
                  <td>1 año</td>
                </tr>
                <tr>
                  <td>cookie_consent</td>
                  <td>Técnica</td>
                  <td>Almacena el estado del consentimiento de cookies</td>
                  <td>6 meses</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="policy-section">
          <h2>
            <Settings size={24} />
            4. Gestión del consentimiento
          </h2>
          <p>
            Cuando accede por primera vez al sitio, puede aceptar, rechazar o configurar
            el uso de cookies no necesarias a través del banner informativo.
          </p>
          <p>
            Podrá modificar su consentimiento en cualquier momento eliminando las cookies
            de su navegador o a través del panel de configuración si estuviera disponible.
          </p>
        </section>

        <section className="policy-section">
          <h2>
            <Trash2 size={24} />
            5. Cómo desactivar o eliminar cookies
          </h2>
          <p>
            Puede permitir, bloquear o eliminar las cookies instaladas en su equipo
            mediante la configuración del navegador que utiliza:
          </p>
          <div className="browsers-grid">
            <a
              href="https://support.google.com/chrome/answer/95647"
              target="_blank"
              rel="noopener noreferrer"
              className="browser-link"
            >
              Google Chrome
            </a>
            <a
              href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias"
              target="_blank"
              rel="noopener noreferrer"
              className="browser-link"
            >
              Mozilla Firefox
            </a>
            <a
              href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
              target="_blank"
              rel="noopener noreferrer"
              className="browser-link"
            >
              Safari
            </a>
            <a
              href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d"
              target="_blank"
              rel="noopener noreferrer"
              className="browser-link"
            >
              Microsoft Edge
            </a>
          </div>
          <p className="warning-text">
            Tenga en cuenta que la desactivación de algunas cookies puede afectar al
            correcto funcionamiento del sitio web.
          </p>
        </section>

        <section className="policy-section">
          <h2>
            <RefreshCcw size={24} />
            6. Actualizaciones
          </h2>
          <p>
            Esta Política de Cookies puede ser modificada para adaptarla a novedades
            legislativas o cambios en las cookies utilizadas. Le recomendamos revisarla
            periódicamente.
          </p>
        </section>

        <footer className="policy-content-footer">
          <p>
            &copy; {new Date().getFullYear()} Garage Manager. Todos los derechos
            reservados.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default CookiesPolicy;
