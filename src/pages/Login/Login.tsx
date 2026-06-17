import { Eye, EyeOff } from 'lucide-react';
import { ClipboardList, Users, Car, Receipt } from 'lucide-react';
import { useState } from 'react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import Footer from '../../components/Footer/Footer';
import type { UserRole } from '../../context/UserContext/types';
import { useUserActions } from '../../context/UserContext/UserContext';
import { ApiError } from '../../services/api/apiClient';
import { getCurrentUser, login } from '../../services/api/auth.api';
import './Login.css';

const Login = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login: setUserSession } = useUserActions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const response = await login({ email, password });
      const profile = await getCurrentUser();

      setUserSession({
        role: profile.role as UserRole,
        userId: profile._id,
        email: profile.email,
        active: profile.active,
        name: profile.name,
        companyId: profile.companyId?._id,
        companyName: profile.companyId?.name,
        companyDocument: profile.companyId?.document,
        companyAddress: profile.companyId?.address,
        companyPhone: profile.companyId?.phone,
        createdAt: profile.createdAt,
        csrfToken: response.csrfToken,
      });

      navigate('/app');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Credenciales incorrectas');
      } else {
        setError('Error inesperado. Inténtelo de nuevo');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      {/* HEADER GLOBAL */}
      <div className="login-top">
        <div className="brand">
          <img className="logo" src="/logos/Logo.png" alt="Logo de Garage Manager" />{' '}
          {/* cambiar a nombre comercial despuies */}
          <span>Garage Manager</span>
        </div>
      </div>

      {/* LEFT */}
      <section className="login-left">
        <div className="hero">
          <h1>Gestión integral para tu taller mecánico</h1>
          <p>
            Todo tu taller en una sola plataforma: órdenes, presupuestos, clientes y
            vehículos. Más control, menos caos y una experiencia mejor para tus clientes.
          </p>
          <div className="features">
            <div className="feature">
              <ClipboardList size={20} />
              <div>
                <h4>Órdenes de trabajo</h4>
                <span>Gestiona reparaciones y tareas fácilmente</span>
              </div>
            </div>
            <div className="feature">
              <Users size={20} />
              <div>
                <h4>Clientes</h4>
                <span>Control total de tu cartera de clientes</span>
              </div>
            </div>
            <div className="feature">
              <Car size={20} />
              <div>
                <h4>Vehículos</h4>
                <span>Historial y seguimiento completo</span>
              </div>
            </div>
            <div className="feature">
              <Receipt size={20} />
              <div>
                <h4>Presupuestos</h4>
                <span>Crea y gestiona presupuestos fácilmente</span>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </section>

      {/* RIGHT */}
      <section className="login-right">
        <form onSubmit={handleSubmit} className="login-card">
          <header className="login-header">
            <h2>Iniciar sesión</h2>
            <p>Ingresa tus credenciales para acceder a tu cuenta</p>
          </header>

          {error && (
            <p className="error" role="alert" aria-live="polite">
              {error}
            </p>
          )}

          <div className="form-group">
            <label htmlFor="email-input">Email</label>
            <input
              type="email"
              id="email-input"
              placeholder="tu@email.com"
              value={email}
              autoComplete="email"
              disabled={loading}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password-input">Contraseña</label>

            <div className="password-input">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                id="password-input"
                placeholder="********"
                value={password}
                autoComplete="current-password"
                disabled={loading}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setShowPassword(!showPassword);
                  inputRef.current?.focus();
                }}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default Login;
