import {
  ArrowLeft,
  Shield,
  Building,
  Target,
  Users,
  BookOpen,
  Send,
  Clock,
  UserCheck,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="privacy-policy-container">
      <div className="privacy-policy-overlay" />

      <main className="privacy-policy-content">
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
            <Shield size={40} className="header-icon" />
          </div>
          <h1>Política de Privacidad</h1>
          <p className="last-updated">Última actualización: Abril 2026</p>
        </header>

        <section className="policy-section">
          <h2>
            <Building size={24} />
            1. Responsable del tratamiento
          </h2>
          <div className="company-data-card">
            <p>
              <strong>Titular:</strong> [NOMBRE DE LA EMPRESA]
            </p>
            <p>
              <strong>NIF/CIF:</strong> [NIF/CIF]
            </p>
            <p>
              <strong>Domicilio:</strong> [DIRECCIÓN FISCAL]
            </p>
            <p>
              <strong>Correo electrónico:</strong> [EMAIL DE CONTACTO]
            </p>
            <p>
              <strong>Teléfono:</strong> [TELÉFONO]
            </p>
          </div>
        </section>

        <section className="policy-section">
          <h2>
            <Target size={24} />
            2. Finalidad del tratamiento
          </h2>
          <p>
            Tratamos los datos personales que nos facilitan con las siguientes
            finalidades:
          </p>
          <ul className="info-list">
            <li>
              Gestionar las solicitudes de información o contacto recibidas a través de la
              web.
            </li>
            <li>Gestionar el alta de usuarios y el acceso a la plataforma.</li>
            <li>Prestar el servicio de software de gestión para talleres.</li>
            <li>
              Gestionar la relación comercial, administrativa y de facturación con
              nuestros clientes.
            </li>
            <li>
              Atender incidencias, soporte técnico y comunicaciones relacionadas con el
              servicio.
            </li>
            <li>Cumplir con las obligaciones legales aplicables.</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>
            <Users size={24} />
            3. Categorías de datos tratados
          </h2>
          <p>Podemos tratar las siguientes categorías de datos:</p>
          <ul className="info-list">
            <li>
              <strong>Datos identificativos:</strong> nombre, apellidos, nombre de
              empresa.
            </li>
            <li>
              <strong>Datos de contacto:</strong> teléfono, correo electrónico, dirección.
            </li>
            <li>
              <strong>Datos de acceso:</strong> usuario, contraseña cifrada, registros de
              acceso.
            </li>
            <li>
              <strong>Datos de facturación:</strong> NIF/CIF, dirección fiscal, datos de
              pago.
            </li>
            <li>
              <strong>Datos técnicos:</strong> IP, logs, navegador, dispositivo,
              incidencias técnicas.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>
            <BookOpen size={24} />
            4. Base jurídica o legitimación
          </h2>
          <p>La base legal para el tratamiento de sus datos puede ser:</p>
          <ul className="info-list">
            <li>
              La ejecución de un contrato o la aplicación de medidas precontractuales.
            </li>
            <li>El cumplimiento de obligaciones legales.</li>
            <li>El interés legítimo para garantizar la seguridad del servicio.</li>
            <li>El consentimiento, en los casos en que resulte necesario.</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>
            <Send size={24} />
            5. Destinatarios de los datos
          </h2>
          <p>Sus datos podrán ser comunicados a:</p>
          <ul className="info-list">
            <li>
              Administraciones públicas y organismos competentes (obligación legal).
            </li>
            <li>Entidades bancarias y proveedores de pago.</li>
            <li>
              Proveedores tecnológicos (alojamiento, soporte, etc.) en calidad de
              encargados del tratamiento.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>
            <Shield size={24} />
            6. Transferencias internacionales
          </h2>
          <p>
            Con carácter general, no se prevén transferencias internacionales de datos
            fuera del Espacio Económico Europeo.
          </p>
        </section>

        <section className="policy-section">
          <h2>
            <Clock size={24} />
            7. Plazo de conservación
          </h2>
          <p>
            Los datos se conservarán mientras se mantenga la relación contractual,
            mientras sean necesarios para la finalidad para la que fueron recogidos, o
            para cumplir con plazos legales obligatorios.
          </p>
        </section>

        <section className="policy-section">
          <h2>
            <UserCheck size={24} />
            8. Derechos de las personas interesadas
          </h2>
          <p>
            Puede ejercer sus derechos de acceso, rectificación, supresión, oposición,
            limitación del tratamiento y portabilidad enviando una solicitud a{' '}
            <strong>[EMAIL DE CONTACTO]</strong>, adjuntando copia de su DNI cuando sea
            necesario.
          </p>
          <p>
            Asimismo, tiene derecho a presentar una reclamación ante la Agencia Española
            de Protección de Datos (AEPD).
          </p>
        </section>

        <section className="policy-section">
          <h2>
            <Lock size={24} />
            9. Seguridad de la información
          </h2>
          <p>
            Aplicamos medidas técnicas y organizativas apropiadas para proteger sus datos
            personales frente a pérdida, alteración o acceso no autorizado.
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

export default PrivacyPolicy;
