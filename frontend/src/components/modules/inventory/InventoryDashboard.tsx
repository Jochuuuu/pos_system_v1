// frontend/src/components/modules/inventory/InventoryDashboard.tsx
import React, { useState } from 'react';
import CategoriesModule from './CategoriesModule';
import ProductsModule from './ProductsModule';  // ← Solo UNA importación
import StockModule from './StockModule';
import type { Familia, Subfamilia } from '../../../types/inventory.types'; // 🆕 IMPORTAR TIPOS

const InventoryDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<string | null>(null);
  
  // 🆕 ESTADOS PARA NAVEGACIÓN INTELIGENTE
  const [selectedSubfamilia, setSelectedSubfamilia] = useState<Subfamilia | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<Familia | null>(null);
  
  // 🆕 CALLBACK PARA NAVEGACIÓN DESDE CATEGORÍAS A PRODUCTOS
  const handleViewProducts = (subfamily: Subfamilia, family: Familia) => {
    console.log('🚀 Navegando a productos:', subfamily.nom, 'de familia:', family.nom);
    setSelectedSubfamilia(subfamily);
    setSelectedFamily(family);
    setActiveView('products');
  };

  // 🆕 LIMPIAR SELECCIÓN AL CAMBIAR DE VISTA
  const handleViewChange = (view: string | null) => {
    if (view !== 'products') {
      setSelectedSubfamilia(null);
      setSelectedFamily(null);
    }
    setActiveView(view);
  };
  
  // Datos de ejemplo para las cartas principales
  const inventoryCards = [
    {
      id: 'products',
      title: 'Productos',
      description: 'Ver y gestionar productos',
      icon: '📦',
      stats: '847 total',
      color: 'primary',
      onClick: () => handleViewChange('products')  // 🆕 USAR NUEVO HANDLER
    },
    {
      id: 'categories',
      title: 'Categorías',
      description: 'Familias y subfamilias',
      icon: '📁',
      stats: '12 familias',
      color: 'success',
      onClick: () => handleViewChange('categories')  // 🆕 USAR NUEVO HANDLER
    },
   {
  id: 'stock',
  title: 'Gestión de Stock',
  description: 'Entradas y control de inventario',
  icon: '📊',
  stats: '12 críticos',
  color: 'warning',
  onClick: () => handleViewChange('stock')
},
    {
      id: 'reports',
      title: 'Reportes',
      description: 'Análisis y estadísticas',
      icon: '📊',
      stats: 'Ver análisis',
      color: 'info',
      onClick: () => console.log('Ir a reportes')
    }
  ];

  const quickActions = [
    {
      id: 'new-product',
      title: 'Nuevo Producto',
      description: 'Agregar al inventario',
      icon: '➕',
      color: 'primary',
      onClick: () => handleViewChange('products')  // 🆕 USAR NUEVO HANDLER
    },
    {
      id: 'search',
      title: 'Búsqueda Avanzada',
      description: 'Filtros y búsquedas',
      icon: '🔍',
      color: 'secondary',
      onClick: () => console.log('Búsqueda avanzada')
    },
    {
      id: 'import',
      title: 'Importar',
      description: 'Desde Excel o CSV',
      icon: '📥',
      color: 'info',
      onClick: () => console.log('Importar productos')
    },
    {
      id: 'settings',
      title: 'Configurar',
      description: 'Parámetros y alertas',
      icon: '⚙️',
      color: 'neutral',
      onClick: () => console.log('Configuración')
    }
  ];

  return (
    <div className="inventory-dashboard">
      {/* Si hay una vista activa, mostrar el módulo correspondiente */}
      {activeView === 'categories' ? (
        <div className="inventory-module-view">
          <div className="inventory-module-header">
            <button 
              className="btn btn--secondary btn--sm"
              onClick={() => handleViewChange(null)}  // 🆕 USAR NUEVO HANDLER
            >
              ← Volver al Inventario
            </button>
          </div>
          {/* 🆕 PASAR CALLBACK A CATEGORIES */}
          <CategoriesModule onViewProducts={handleViewProducts} />
        </div>
      )
      : activeView === 'stock' ? (
  <div className="inventory-module-view">
    <div className="inventory-module-header">
      <button 
        className="btn btn--secondary btn--sm"
        onClick={() => handleViewChange(null)}
      >
        ← Volver al Inventario
      </button>
    </div>
    <StockModule />
  </div>
) 
      : activeView === 'products' ? (
        <div className="inventory-module-view">
          <div className="inventory-module-header">
            <button 
              className="btn btn--secondary btn--sm"
              onClick={() => handleViewChange(null)}  // 🆕 USAR NUEVO HANDLER
            >
              ← Volver al Inventario
            </button>
            
            {/* 🔧 MOSTRAR CONTEXTO SOLO SI ES NAVEGACIÓN MANUAL (NO desde Categories) */}
            {selectedSubfamilia && selectedFamily && activeView === 'products' && (
              <div className="navigation-context" style={{ display: 'none' }}>
                {/* 🚫 OCULTAR ESTE CONTEXTO - ProductsModule ya maneja la info */}
                <span className="navigation-context__text">
                  📦 Productos de: <strong>{selectedFamily.nom} › {selectedSubfamilia.nom}</strong>
                </span>
                <button 
                  className="btn btn--tertiary btn--sm"
                  onClick={() => handleViewChange('categories')}
                  title="Volver a categorías"
                >
                  📁 Categorías
                </button>
              </div>
            )}
          </div>
          
          {/* 🆕 PASAR DATOS PRESELECCIONADOS A PRODUCTS */}
          <ProductsModule 
            preSelectedSubfamilia={selectedSubfamilia}
            preSelectedFamily={selectedFamily}
          />
        </div>
      ) : (
        /* Vista principal del dashboard con las cartas */
        <>
          {/* Header del módulo */}
          <div className="module-header">
            <h2 className="module-title">Gestión de Inventario</h2>
            <p className="module-description">
              Administra productos, categorías y control de stock
            </p>
          </div>

          {/* Cards principales de navegación */}
          <div className="inventory-cards-section">
            <h3 className="section-subtitle">Módulos Principales</h3>
            <div className="inventory-cards-grid">
              {inventoryCards.map((card) => (
                <div
                  key={card.id}
                  className={`inventory-card inventory-card--${card.color}`}
                  onClick={card.onClick}
                >
                  <div className="inventory-card__header">
                    <div className="inventory-card__icon">{card.icon}</div>
                    <h4 className="inventory-card__title">{card.title}</h4>
                  </div>
                  <p className="inventory-card__description">{card.description}</p>
                  <div className="inventory-card__stats">{card.stats}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="quick-actions-section">
            <h3 className="section-subtitle">Acciones Rápidas</h3>
            <div className="quick-actions-grid">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  className={`quick-action-btn quick-action-btn--${action.color}`}
                  onClick={action.onClick}
                >
                  <div className="quick-action-btn__icon">{action.icon}</div>
                  <div className="quick-action-btn__content">
                    <h5 className="quick-action-btn__title">{action.title}</h5>
                    <span className="quick-action-btn__description">
                      {action.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Resumen rápido */}
          <div className="inventory-summary">
            <h3 className="section-subtitle">Resumen del Inventario</h3>
            <div className="inventory-summary__content">
              <div className="inventory-summary__stats">
                <div className="summary-stat">
                  <span className="summary-stat__label">Valor total del stock:</span>
                  <span className="summary-stat__value">$25,847.50</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-stat__label">Productos activos:</span>
                  <span className="summary-stat__value">847</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-stat__label">Productos inactivos:</span>
                  <span className="summary-stat__value">23</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-stat__label">Última actualización:</span>
                  <span className="summary-stat__value">Hoy 14:30</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryDashboard;