// frontend/src/components/modules/inventory/StockModule.tsx
import React, { useState, useEffect } from 'react';
import { CriticalStockList, StockEntryForm } from './stock';
import { useProductsStore } from '../../../stores/inventory/productsStore';
import { useStockStore } from '../../../stores/inventory/stockStore';
import type { Product, StockFilters } from '../../../types/inventory.types';

const StockModule: React.FC = () => {
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState<StockFilters>({
    criticidad: 'all',
    search: ''
  });

  // 🔌 CONECTAR CON STORES REALES
  const {
    products,
    isLoading: loadingProducts,
    error: productsError,
    loadProducts
  } = useProductsStore();

  const {
    loadStockStats,
    stats,
    isLoadingStats,
    clearError: clearStockError
  } = useStockStore();

  // 🚀 CARGAR DATOS AL MONTAR
  useEffect(() => {
    loadCriticalProducts();
    loadStockStats(30); // Estadísticas de últimos 30 días
  }, []);

  const loadCriticalProducts = async () => {
    try {
      // Cargar productos con stock bajo (usar filtros del backend)
      await loadProducts({
        // Cargar todos los productos activos para filtrar localmente
        activo: true,
        includeInactive: false
      });
    } catch (error) {
      console.error('Error cargando productos críticos:', error);
    }
  };

  // 📊 FILTRAR PRODUCTOS CRÍTICOS (stock < 10)
  const criticalProducts = products.filter(product => 
    product.activo && product.stock < 10
  );

  const handleQuickEntry = (product: Product) => {
    setSelectedProduct(product);
    setShowEntryForm(true);
  };

  const handleNewEntry = () => {
    setSelectedProduct(null);
    setShowEntryForm(true);
  };

  const handleCloseForm = () => {
    setShowEntryForm(false);
    setSelectedProduct(null);
  };

  const handleEntrySuccess = () => {
    setShowEntryForm(false);
    setSelectedProduct(null);
    // Recargar productos para actualizar stock
    loadCriticalProducts();
    // Recargar estadísticas
    loadStockStats(30);
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (filterType: keyof StockFilters, value: any) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  // 🔍 APLICAR FILTROS LOCALMENTE
  const filteredProducts = criticalProducts.filter(product => {
    const matchesSearch = !filters.search || 
      product.descripcion.toLowerCase().includes(filters.search.toLowerCase()) ||
      product.cod.includes(filters.search);

    const matchesCriticidad = filters.criticidad === 'all' || 
      (filters.criticidad === 'AGOTADO' && product.stock === 0) ||
      (filters.criticidad === 'CRITICO' && product.stock > 0 && product.stock <= 5) ||
      (filters.criticidad === 'BAJO' && product.stock > 5 && product.stock < 10);

    return matchesSearch && matchesCriticidad;
  });

  // 📈 CALCULAR CONTADORES
  const getCriticalCount = () => {
    return {
      total: criticalProducts.length,
      agotado: criticalProducts.filter(p => p.stock === 0).length,
      critico: criticalProducts.filter(p => p.stock > 0 && p.stock <= 5).length,
      bajo: criticalProducts.filter(p => p.stock > 5 && p.stock < 10).length
    };
  };

  const counts = getCriticalCount();
  const loading = loadingProducts || isLoadingStats;

  // 🔄 HANDLE REFRESH
  const handleRefresh = async () => {
    clearStockError();
    await Promise.all([
      loadCriticalProducts(),
      loadStockStats(30)
    ]);
  };

  return (
    <div className="stock-module">
      {/* Header */}
      <div className="stock-module-header">
        <div className="stock-module-header-left">
          <h2 className="stock-module-title">
            📦 Gestión de Stock 
            <span className="stock-module-subtitle">
              Control de inventario y reposición de productos
              {stats && (
                <small style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginTop: '4px' }}>
                  {stats.estadisticas.total_entradas} entradas registradas en {stats.periodo.toLowerCase()}
                </small>
              )}
            </span>
          </h2>
        </div>
        <div className="stock-module-header-right">
          <button 
            className="btn btn--primary"
            onClick={handleNewEntry}
            disabled={loading}
          >
            ➕ Nueva Entrada
          </button>
        </div>
      </div>

      {/* Error handling */}
      {productsError && (
        <div className="error-banner" style={{
          background: 'var(--error-light)',
          color: 'var(--error)',
          padding: 'var(--spacing-sm)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--spacing-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)'
        }}>
          <span>⚠️</span>
          <span>Error al cargar productos: {productsError}</span>
          <button 
            onClick={handleRefresh}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'inherit', 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="stock-filters">
        <div className="search-container">
          <div className="search-input-wrapper">
            <svg className="search-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar productos por código o descripción..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
              disabled={loading}
            />
          </div>
        </div>

        <div className="filter-controls">
          <select
            value={filters.criticidad}
            onChange={(e) => handleFilterChange('criticidad', e.target.value)}
            className="filter-select"
            disabled={loading}
          >
            <option value="all">Todos los niveles</option>
            <option value="AGOTADO">🔴 Agotados ({counts.agotado})</option>
            <option value="CRITICO">🟡 Críticos ({counts.critico})</option>
            <option value="BAJO">🟠 Bajos ({counts.bajo})</option>
          </select>

          <button 
            className="btn btn--secondary btn--sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? '⏳' : '🔄'} Actualizar
          </button>
        </div>
      </div>

      {/* Resumen de estado */}
      <div className="stock-summary">
        <div className="summary-cards">
          <div className="summary-card summary-card--error">
            <div className="summary-icon">🔴</div>
            <div className="summary-content">
              <div className="summary-number">
                {loading ? '...' : counts.agotado}
              </div>
              <div className="summary-label">Agotados</div>
            </div>
          </div>
          
          <div className="summary-card summary-card--warning">
            <div className="summary-icon">🟡</div>
            <div className="summary-content">
              <div className="summary-number">
                {loading ? '...' : counts.critico}
              </div>
              <div className="summary-label">Críticos</div>
            </div>
          </div>
          
          <div className="summary-card summary-card--info">
            <div className="summary-icon">🟠</div>
            <div className="summary-content">
              <div className="summary-number">
                {loading ? '...' : counts.bajo}
              </div>
              <div className="summary-label">Stock Bajo</div>
            </div>
          </div>
          
          <div className="summary-card summary-card--total">
            <div className="summary-icon">📊</div>
            <div className="summary-content">
              <div className="summary-number">
                {loading ? '...' : counts.total}
              </div>
              <div className="summary-label">Total Críticos</div>
            </div>
          </div>
        </div>

        {/* Estadísticas adicionales */}
        {stats && !isLoadingStats && (
          <div className="stock-stats-summary" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--spacing-sm)',
            marginTop: 'var(--spacing-md)',
            padding: 'var(--spacing-sm)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--primary)' }}>
                S/ {stats.estadisticas.monto_total.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Invertido en stock ({stats.periodo.toLowerCase()})
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--success)' }}>
                {stats.estadisticas.total_entradas}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Entradas registradas
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--warning)' }}>
                {stats.estadisticas.productos_totales}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Productos ingresados
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de productos críticos */}
      <div className="stock-content">
        <div className="stock-section-header">
          <h3 className="stock-section-title">
            ⚠️ Productos que Requieren Atención
          </h3>
          {filteredProducts.length > 0 && (
            <span className="stock-count">
              {filteredProducts.length} de {criticalProducts.length} productos
            </span>
          )}
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando productos críticos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h4>
              {criticalProducts.length === 0 
                ? 'No hay productos críticos' 
                : 'No se encontraron productos'
              }
            </h4>
            <p>
              {filters.search || filters.criticidad !== 'all' 
                ? 'No se encontraron productos con los filtros aplicados.'
                : criticalProducts.length === 0
                  ? '¡Excelente! Todos los productos tienen stock suficiente.'
                  : 'Ajusta los filtros para ver productos específicos.'
              }
            </p>
            {(filters.search || filters.criticidad !== 'all') && (
              <button 
                className="btn btn--secondary btn--sm"
                onClick={() => setFilters({ criticidad: 'all', search: '' })}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <CriticalStockList 
            products={filteredProducts}
            onQuickEntry={handleQuickEntry}
            loading={loading}
          />
        )}
      </div>

      {/* Modal de entrada de stock */}
      {showEntryForm && (
        <StockEntryForm
          product={selectedProduct}
          onClose={handleCloseForm}
          onSuccess={handleEntrySuccess}
        />
      )}
    </div>
  );
};

export default StockModule;