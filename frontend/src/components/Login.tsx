// frontend/src/components/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import ThemeToggle from './ThemeToggle';
import '../styles/index.css';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, error, isLoading, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error cuando el usuario empiece a escribir
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (error) {
      // Error ya manejado en el store
      console.error('Error en login:', error);
    }
  };

  const fillDemoCredentials = (userType: 'admin' | 'cashier') => {
    setFormData({
      email: userType === 'admin' ? 'admin' : 'cajero',
      password: 'password'  // ← Cambiar temporalmente a 'password'
    });
    clearError();
  };

  return (
    <div className="main-min-h-screen main-flex main-items-center main-justify-center main-bg-secondary">
      {/* Theme Toggle */}
      <ThemeToggle />
      
      <div className="main-container-sm">
        <div className="main-fade-in">
          {/* Header */}
          <div className="main-text-center main-mb-8">
            <div className="main-brand-icon main-mx-auto main-mb-6">
              POS
            </div>
            <h1 className="main-text-3xl main-font-bold main-text-primary main-mb-2">
              Sistema POS
            </h1>
            <p className="main-text-secondary">
              Inicia sesión para acceder al sistema
            </p>
          </div>

          {/* Login Form */}
          <div className="main-card">
            <div className="main-card-body">
              <form onSubmit={handleSubmit} className="main-space-y-6">
                {/* Username Field */}
                <div className="main-input-group">
                  <label htmlFor="email" className="main-input-label">
                    Usuario
                  </label>
                  <div className="main-input-with-icon">
                    <svg 
                      className="main-input-icon" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                      />
                    </svg>
                    <input
                      id="email"
                      name="email"
                      type="text"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="main-input-field"
                      placeholder="admin"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="main-input-group">
                  <label htmlFor="password" className="main-input-label">
                    Contraseña
                  </label>
                  <div className="main-input-with-icon">
                    <svg 
                      className="main-input-icon" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                      />
                    </svg>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      className="main-input-field"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      style={{ paddingRight: '3rem' }}
                    />
                    
                    {/* Toggle Password Visibility */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="main-password-toggle"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="main-alert main-alert-error">
                    <div className="main-flex main-items-center main-gap-2">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="main-text-sm">{error}</span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !formData.email || !formData.password}
                  className="main-btn main-btn-primary main-btn-full main-btn-lg"
                >
                  {isLoading ? (
                    <>
                      <div className="main-loading-spinner"></div>
                      Iniciando sesión...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Iniciar Sesión
                    </>
                  )}
                </button>
              </form>

              {/* Demo Users Section */}
              <div className="main-mt-8 main-border-t main-pt-6">
                <div className="main-text-center main-mb-4">
                  <p className="main-text-sm main-font-medium main-text-secondary">
                    Usuarios de Demostración
                  </p>
                </div>
                
                <div className="main-grid-cols-2">
                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('admin')}
                    className="main-btn main-btn-secondary main-btn-sm"
                    disabled={isLoading}
                  >
                    <span className="main-text-lg">👨‍💼</span>
                    <div className="main-text-left">
                      <div className="main-font-medium">Administrador</div>
                      <div className="main-text-xs main-text-muted">Usuario: admin</div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('cashier')}
                    className="main-btn main-btn-secondary main-btn-sm"
                    disabled={isLoading}
                  >
                    <span className="main-text-lg">💼</span>
                    <div className="main-text-left">
                      <div className="main-font-medium">Cajero</div>
                      <div className="main-text-xs main-text-muted">Usuario: cajero</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="main-text-center main-mt-8">
            <p className="main-text-xs main-text-muted">
              © 2024 Sistema POS Professional • Versión 1.0.0
            </p>
            <div className="main-mt-2">
              <a href="#" className="main-text-xs main-text-secondary main-hover-primary main-transition-fast">
                ¿Necesitas ayuda?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;