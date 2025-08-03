// frontend/src/components/Dashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

import { CustomerList } from './modules/customers';
import { InventoryDashboard } from './modules/inventory';

import '../styles/dashboard.css';

const Dashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar sidebar en mobile al cambiar de ruta
  useEffect(() => {
    setSidebarOpen(false);
  }, [activeNav]);

  // Cerrar sidebar en mobile al redimensionar a desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = (navId: string) => {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      setSidebarOpen(false);
    }
    
    if (activeNav === navId && isMobile) {
      const navElement = document.querySelector(`[data-nav="${navId}"]`);
      if (navElement) {
        navElement.classList.add('nav-pulse');
        setTimeout(() => {
          navElement.classList.remove('nav-pulse');
        }, 300);
      }
    }
    
    setActiveNav(navId);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Navegación optimizada basada en tu BD
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'sales',
      label: 'Punto de Venta',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0H17" />
        </svg>
      )
    },
    {
      id: 'inventory',
      label: 'Inventario',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      id: 'customers',
      label: 'Clientes',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
    {
      id: 'promotions',
      label: 'Promociones',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    }
  ];

  // Filtrar navegación según rol
  const getFilteredNavItems = () => {
    if (user?.role === 'C') { // Cajero
      return navItems.filter(item => 
        ['dashboard', 'sales', 'inventory', 'customers'].includes(item.id)
      );
    }
    
    if (user?.role === 'S' ) { // Supervisor
      return navItems.filter(item => 
        ['dashboard', 'sales', 'inventory', 'customers', 'promotions', 'reports'].includes(item.id)
      );
    }
    
    // Administrador - acceso completo
    return navItems;
  };

  const filteredNavItems = getFilteredNavItems();

  // Stats basados en tu BD PostgreSQL
  const statsData = [
    {
      title: 'Ventas Hoy',
      value: '$2,847',
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: 'primary' as const,
      iconSvg: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      title: 'Productos Vendidos',
      value: '156',
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: 'success' as const,
      iconSvg: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      title: 'Stock Crítico',
      value: '23',
      change: 'Requiere atención',
      changeType: 'warning' as const,
      icon: 'warning' as const,
      iconSvg: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    },
    {
      title: 'Clientes Registrados',
      value: '847',
      change: '+15.3%',
      changeType: 'positive' as const,
      icon: 'primary' as const,
      iconSvg: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    }
  ];

  // Quick actions actualizadas
  const quickActions = [
    {
      title: 'Nueva Venta',
      description: 'Iniciar punto de venta',
      icon: '🛒',
      onClick: () => handleNavClick('sales')
    },
    {
      title: 'Gestionar Inventario',
      description: 'Productos y stock',
      icon: '📦',
      onClick: () => handleNavClick('inventory')
    },
    {
      title: 'Crear Promoción',
      description: 'Ofertas y descuentos',
      icon: '🏷️',
      onClick: () => handleNavClick('promotions'),
      hidden: user?.role === 'C' // Ocultar para cajeros
    },
    {
      title: 'Ver Reportes',
      description: 'Análisis de ventas',
      icon: '📊',
      onClick: () => handleNavClick('reports'),
      hidden: user?.role === 'C' // Ocultar para cajeros
    }
  ].filter(action => !action.hidden);

  return (
    <div className="dashboard-layout">
      {/* Overlay para mobile */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="main-brand-icon">POS</div>
            <span>Sistema POS</span>
          </div>
        </div>

        <div className="sidebar-content">
          <nav>
            <ul className="sidebar-nav">
              {filteredNavItems.map((item) => (
                <li key={item.id} className="nav-item">
                  <a
                    href="#"
                    className={`nav-link ${activeNav === item.id ? 'active' : ''}`}
                    data-nav={item.id}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.id);
                    }}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-text">{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="sidebar-footer">
            <div className="theme-toggle-container">
              <ThemeToggle />
              <span className="theme-label">Cambiar tema</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="main-header">
          <div className="header-content">
            <div className="header-left">
              <button
                className="sidebar-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle sidebar"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <h1 className="page-title">
                {filteredNavItems.find(item => item.id === activeNav)?.label || 'Dashboard'}
              </h1>
            </div>

            <div className="header-right">
              <div className="user-menu" ref={dropdownRef}>
                <div 
                  className="user-avatar"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                
                <div className={`user-dropdown ${userDropdownOpen ? 'open' : ''}`}>
                  <div className="dropdown-header">
                    <div className="dropdown-name">{user?.name}</div>
                    <div className="dropdown-role">
                      {user?.role === 'A' ? 'Administrador' : 
                       user?.role === 'S' ? 'Supervisor' : 'Cajero'}
                    </div>
                  </div>
                  
                  <div className="dropdown-menu">
                    <a href="#" className="dropdown-item">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Mi Perfil
                    </a>
                    <a href="#" className="dropdown-item">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configuración
                    </a>
                    <button 
                      className="dropdown-item danger"
                      onClick={handleLogout}
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {activeNav === 'dashboard' && (
            <>
              {/* Stats Cards */}
              <div className="stats-grid">
                {statsData.map((stat, index) => (
                  <div key={index} className="stat-card">
                    <div className="stat-header">
                      <span className="stat-title">{stat.title}</span>
                      <div className={`stat-icon ${stat.icon}`}>
                        {stat.iconSvg}
                      </div>
                    </div>
                    <div className="stat-value">{stat.value}</div>
                    <div className={`stat-change ${stat.changeType}`}>
                      {stat.change}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                {quickActions.map((action, index) => (
                  <div 
                    key={index} 
                    className="action-card"
                    onClick={action.onClick}
                  >
                    <div className="action-icon">{action.icon}</div>
                    <h3 className="action-title">{action.title}</h3>
                    <p className="action-description">{action.description}</p>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="main-card">
                <div className="main-card-body">
                  <h2 className="section-title">Actividad Reciente</h2>
                  <div className="activity-list">
                    <div className="activity-item">
                      <div className="activity-icon success">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">Venta completada</div>
                        <div className="activity-description">Factura #001234 - $45.99</div>
                        <div className="activity-time">Hace 5 minutos</div>
                      </div>
                    </div>
                    
                    <div className="activity-item">
                      <div className="activity-icon warning">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">Stock crítico</div>
                        <div className="activity-description">Coca Cola 500ml - Solo 5 unidades</div>
                        <div className="activity-time">Hace 15 minutos</div>
                      </div>
                    </div>
                    
                    <div className="activity-item">
                      <div className="activity-icon primary">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">Nuevo cliente</div>
                        <div className="activity-description">María González registrada</div>
                        <div className="activity-time">Hace 1 hora</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Secciones del dashboard */}
          {activeNav === 'sales' && (
            <div className="section-content">
              <h2 className="section-title">Punto de Venta</h2>
              <p className="text-secondary">Aquí iría el módulo de ventas...</p>
            </div>
          )}

         {activeNav === 'inventory' && (
  <InventoryDashboard />
)}
          {activeNav === 'customers' && (
            <CustomerList />
          )}

          {activeNav === 'promotions' && (
            <div className="section-content">
              <h2 className="section-title">Promociones y Ofertas</h2>
              <p className="text-secondary">Combos, descuentos y ofertas especiales...</p>
            </div>
          )}

          {activeNav === 'reports' && (
            <div className="section-content">
              <h2 className="section-title">Reportes y Estadísticas</h2>
              <p className="text-secondary">Análisis de ventas y reportes del sistema...</p>
            </div>
          )}

          {activeNav === 'users' && (
            <div className="section-content">
              <h2 className="section-title">Gestión de Usuarios</h2>
              <p className="text-secondary">Administrar cajeros, supervisores y permisos...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;