// frontend/src/components/modules/inventory/ProductsModule.tsx
// USANDO PRODUCTSSTORE REAL - CON API BACKEND + PRESELECCIÓN DESDE CATEGORIES
import React, { useState, useEffect } from 'react';
import { ProductCard, ProductForm } from './products';
import { useAuthStore } from '../../../stores/authStore';
import { useProductsStore } from '../../../stores/inventory/productsStore'; // ← NUEVO STORE REAL
import { useCategoriesStore } from '../../../stores/inventory/categoriesStore'; // ← PARA SUBFAMILIAS
import type { Familia, Subfamilia, Product } from '../../../types/inventory.types';

type ViewMode = 'families' | 'subfamilies' | 'products';

// 🆕 AGREGAR PROPS PARA PRESELECCIÓN
interface ProductsModuleProps {
  preSelectedSubfamilia?: Subfamilia | null;
  preSelectedFamily?: Familia | null;
}

const ProductsModule: React.FC<ProductsModuleProps> = ({
  preSelectedSubfamilia,
  preSelectedFamily
}) => {
  // 🔐 OBTENER ROL DEL USUARIO DESDE AuthStore
  const { user } = useAuthStore();
  const userRole = user?.role as 'A' | 'S' | 'C' || 'C';
  
  // 🏪 STORES REALES
  const {
    products,
    isLoading,
    error,
    pagination,
    filters,
    loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    setFilters,
    clearFilters,
    clearError,
    nextPage,
    prevPage
  } = useProductsStore();

  const {
    familias,
    loadCategories
  } = useCategoriesStore();

  // Estados para navegación
  const [view, setView] = useState<ViewMode>('families');
  const [selectedFamily, setSelectedFamily] = useState<Familia | null>(null);
  const [selectedSubfamilia, setSelectedSubfamilia] = useState<Subfamilia | null>(null);
  const [selectedSubfamiliaForNewProduct, setSelectedSubfamiliaForNewProduct] = useState<Subfamilia | null>(null); // 🆕 Para pre-seleccionar
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para ProductForm
  const [showProductForm, setShowProductForm] = useState(false);
  const [productFormMode, setProductFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadCategories(); // Cargar categorías para navegación
  }, [loadCategories]);

  // 🆕 EFECTO PARA MANEJAR PRESELECCIÓN DESDE CATEGORIES
  useEffect(() => {
    console.log('🔍 Props preselección:', { preSelectedSubfamilia, preSelectedFamily });
    
    if (preSelectedSubfamilia && preSelectedFamily) {
      console.log('🚀 Aplicando preselección automática');
      
      // Configurar navegación directa a productos
      setSelectedFamily(preSelectedFamily);
      setSelectedSubfamilia(preSelectedSubfamilia);
      setView('products');
      
      // Cargar productos de la subfamilia preseleccionada
      loadProducts({ sub_id: preSelectedSubfamilia.id });
      
      // Limpiar búsqueda si había alguna
      setSearchTerm('');
      clearFilters();
    }
  }, [preSelectedSubfamilia, preSelectedFamily, loadProducts, clearFilters]);

  // Cargar productos cuando cambie la vista (solo si no es preselección)
  useEffect(() => {
    if (view === 'products' && selectedSubfamilia && !preSelectedSubfamilia) {
      loadProducts({ sub_id: selectedSubfamilia.id });
    }
  }, [view, selectedSubfamilia, loadProducts, preSelectedSubfamilia]);

  // Realizar búsqueda en tiempo real
  useEffect(() => {
    if (searchTerm.trim()) {
      const debounceTimer = setTimeout(() => {
        loadProducts({ search: searchTerm.trim() });
      }, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [searchTerm, loadProducts]);

  // =============================================
  // HANDLERS DE NAVEGACIÓN
  // =============================================
  const handleFamilySelect = (familia: Familia) => {
    setSelectedFamily(familia);
    setSelectedSubfamilia(null);
    setView('subfamilies');
    clearFilters();
  };

  const handleSubfamiliaSelect = (subfamilia: Subfamilia) => {
    setSelectedSubfamilia(subfamilia);
    setView('products');
    // Los productos se cargarán automáticamente por el useEffect
  };

  const handleBackToFamilies = () => {
    setView('families');
    setSelectedFamily(null);
    setSelectedSubfamilia(null);
    clearFilters();
  };

  const handleBackToSubfamilies = () => {
    setView('subfamilies');
    setSelectedSubfamilia(null);
    clearFilters();
  };

  // =============================================
  // HANDLERS DE PRODUCTOS
  // =============================================
  const handleNewProduct = () => {
    setSelectedProduct(null);
    setProductFormMode('create');
    setShowProductForm(true);
    // 🆕 Si hay subfamilia seleccionada, limpiar después de usar
    // Se manejará en ProductForm con selectedSubfamiliaForNewProduct
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductFormMode('edit');
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (confirm(`¿Estás seguro de eliminar el producto "${product.descripcion}"?`)) {
      const result = await deleteProduct(product.cod);
      if (result.success) {
        console.log('✅ Producto eliminado exitosamente');
      }
    }
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setProductFormMode('view');
    setShowProductForm(true);
  };

  // =============================================
  // HANDLER PARA GUARDAR PRODUCTO
  // =============================================
  const handleSaveProduct = async (productData: Partial<Product>) => {
    let result;
    
    if (productFormMode === 'create') {
      // Remover campo 'subfamilia' que es solo para frontend
      const { subfamilia, ...cleanData } = productData as any;
      result = await createProduct(cleanData);
    } else if (productFormMode === 'edit' && selectedProduct) {
      const { subfamilia, ...cleanData } = productData as any;
      result = await updateProduct(selectedProduct.cod, cleanData);
    }

    if (result?.success) {
      setShowProductForm(false);
      setSelectedProduct(null);
    }
    // Los errores se manejan automáticamente en el store
  };

  // =============================================
  // HELPERS
  // =============================================
  const handleReload = () => {
    if (searchTerm.trim()) {
      loadProducts({ search: searchTerm.trim() });
    } else if (selectedSubfamilia) {
      loadProducts({ sub_id: selectedSubfamilia.id });
    } else {
      loadProducts();
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    clearFilters();
    if (view === 'products' && selectedSubfamilia) {
      loadProducts({ sub_id: selectedSubfamilia.id });
    }
  };

  // Obtener subfamilias aplanadas para el selector del formulario
  const getAllSubfamilias = (): Subfamilia[] => {
    return familias.flatMap(familia => familia.subfamilias);
  };

  // Productos filtrados por búsqueda o subfamilia
  const displayProducts = products;

  // 🆕 DETERMINAR SI ES NAVEGACIÓN DESDE CATEGORIES
  const isFromCategories = preSelectedSubfamilia && preSelectedFamily;

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="products-module">
      {/* Header */}
      <div className="module-header">
        <div className="module-header__content">
          <div className="module-header__left">
            <h2 className="module-title">Gestión de Productos</h2>
            <p className="module-description">
              {searchTerm 
                ? `Resultados de búsqueda: "${searchTerm}" (${products.length} productos)`
                : view === 'families' 
                  ? 'Selecciona una familia de productos'
                  : view === 'subfamilies'
                    ? `Subfamilias de ${selectedFamily?.nom}`
                    : `Productos de ${selectedSubfamilia?.nom} (${products.length} productos)`
              }
            </p>
            <small style={{ color: '#666', fontSize: '0.75rem' }}>
              Usuario: {user?.name} | Rol: {userRole} ({userRole === 'A' ? 'Admin' : userRole === 'S' ? 'Supervisor' : 'Cajero'})
              {isFromCategories && ' | 📦 Navegación desde Categorías'}
            </small>
          </div>
          <button 
            className="btn btn--primary"
            onClick={handleNewProduct}
            disabled={isLoading}
          >
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Error global */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button className="error-close" onClick={clearError}>×</button>
        </div>
      )}

      {/* Búsqueda directa */}
      <div className="categories-toolbar">
        <div className="search-container">
          <div className="search-input-wrapper">
            <svg className="search-input__icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar productos por nombre, código o categoría..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
            />
            {searchTerm && (
              <button 
                className="search-clear"
                onClick={clearSearch}
                title="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <button 
          className="btn btn--secondary btn--sm"
          onClick={handleReload}
          disabled={isLoading}
        >
          {isLoading ? '🔄 Cargando...' : '🔄 Recargar'}
        </button>
      </div>

      {/* 🆕 BREADCRUMB MEJORADO - Incluye navegación desde Categories */}
      {!searchTerm && view !== 'families' && (
        <div className="breadcrumb">
          <button className="breadcrumb-item" onClick={handleBackToFamilies}>
            📦 Familias
          </button>
          {selectedFamily && (
            <>
              <span className="breadcrumb-separator">›</span>
              <button 
                className="breadcrumb-item"
                onClick={handleBackToSubfamilies}
              >
                📁 {selectedFamily.nom}
              </button>
            </>
          )}
          {selectedSubfamilia && (
            <>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-item breadcrumb-item--current">
                🏷️ {selectedSubfamilia.nom}
              </span>
              {isFromCategories && (
                <span className="breadcrumb-badge">📦 Desde Categorías</span>
              )}
            </>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="loading-state">
          <span className="loading-spinner"></span>
          <span>Cargando productos...</span>
        </div>
      )}

      {/* Contenido principal */}
      {!isLoading && (
        <div className="products-content">
          {searchTerm || view === 'products' ? (
            /* Resultados de búsqueda o productos de subfamilia */
            <>
              {searchTerm && (
                <div className="search-results-header">
                  <h3>Resultados de búsqueda ({displayProducts.length})</h3>
                  <button className="btn btn--secondary btn--sm" onClick={clearSearch}>
                    Volver a navegación
                  </button>
                </div>
              )}
              
              {view === 'products' && !searchTerm && (
                <div className="products-stats">
                  <div className="products-stats__item">
                    <span className="products-stats__label">Productos en {selectedSubfamilia?.nom}:</span>
                    <span className="products-stats__value">{displayProducts.length}</span>
                  </div>
                  <div className="products-stats__item">
                    <span className="products-stats__label">Stock crítico:</span>
                    <span className="products-stats__value products-stats__value--warning">
                      {displayProducts.filter(p => p.stock <= 10 && p.stock > 0).length}
                    </span>
                  </div>
                  <div className="products-stats__item">
                    <span className="products-stats__label">Sin stock:</span>
                    <span className="products-stats__value products-stats__value--danger">
                      {displayProducts.filter(p => p.stock === 0).length}
                    </span>
                  </div>
                </div>
              )}

              {displayProducts.length === 0 ? (
                // 🆕 SOLO CARD "+" - SIN MENSAJES DE EMPTY STATE
                selectedSubfamilia && (userRole === 'A' || userRole === 'S') ? (
                  <div className="products-grid">
                    <div 
                      className="product-card product-card--add-new"
                      onClick={() => {
                        setSelectedSubfamiliaForNewProduct(selectedSubfamilia);
                        handleNewProduct();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedSubfamiliaForNewProduct(selectedSubfamilia);
                          handleNewProduct();
                        }
                      }}
                    >
                      <div className="product-card__add-content">
                        <div className="product-card__add-icon">
                          <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <h4 className="product-card__add-title">
                          {searchTerm ? 'Crear Producto' : 'Primer Producto'}
                        </h4>
                        <p className="product-card__add-subtitle">en {selectedSubfamilia.nom}</p>
                        <span className="product-card__add-hint">
                          {searchTerm ? 'Crear nuevo producto aquí' : 'Click para crear'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // 🆕 MENSAJE PARA CAJEROS SIN PRODUCTOS
                 null
                )
              ) : (
                <>
                  <div className="products-grid">
                    {displayProducts.map((product) => (
                      <ProductCard
                        key={product.cod}
                        product={product}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                        onViewDetails={handleViewDetails}
                        userRole={userRole}
                      />
                    ))}
                    
                    {/* 🆕 CARD "+" PARA AGREGAR PRODUCTO - Solo en vista de subfamilia y <50 productos */}
                    {view === 'products' && selectedSubfamilia && (userRole === 'A' || userRole === 'S') && displayProducts.length < 50 && (
                      <div 
                        className="product-card product-card--add-new"
                        onClick={() => {
                          setSelectedSubfamiliaForNewProduct(selectedSubfamilia);
                          handleNewProduct();
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedSubfamiliaForNewProduct(selectedSubfamilia);
                            handleNewProduct();
                          }
                        }}
                      >
                        <div className="product-card__add-content">
                          <div className="product-card__add-icon">
                            <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <h4 className="product-card__add-title">Agregar Producto</h4>
                          <p className="product-card__add-subtitle">a {selectedSubfamilia.nom}</p>
                          <span className="product-card__add-hint">Click para crear</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Paginación */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="pagination">
                      <button 
                        className="pagination__btn"
                        onClick={prevPage}
                        disabled={!pagination.hasPrev || isLoading}
                      >
                        ← Anterior
                      </button>
                      
                      <span className="pagination__info">
                        Página {pagination.page} de {pagination.totalPages} 
                        ({pagination.total} productos total)
                      </span>
                      
                      <button 
                        className="pagination__btn"
                        onClick={nextPage}
                        disabled={!pagination.hasNext || isLoading}
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : view === 'families' ? (
            /* Vista de familias */
            <>
              <h3 className="section-subtitle">Familias de Productos</h3>
              <div className="families-grid">
                {familias.map((familia) => (
                  <div
                    key={familia.id}
                    className="family-card"
                    onClick={() => handleFamilySelect(familia)}
                  >
                    <div className="family-card__icon">📁</div>
                    <h4 className="family-card__title">{familia.nom}</h4>
                    <p className="family-card__stats">
                      {familia.subfamilias.length} subfamilias
                    </p>
                    <p className="family-card__products">
                      {familia.productCount || 0} productos
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Vista de subfamilias */
            <>
              <h3 className="section-subtitle">
                Subfamilias de {selectedFamily?.nom}
              </h3>
              <div className="subfamilies-grid">
                {selectedFamily?.subfamilias.map((subfamilia) => (
                  <div
                    key={subfamilia.id}
                    className="subfamily-card"
                    onClick={() => handleSubfamiliaSelect(subfamilia)}
                  >
                    <div className="subfamily-card__icon">🏷️</div>
                    <h4 className="subfamily-card__title">{subfamilia.nom}</h4>
                    <p className="subfamily-card__products">
                      {subfamilia.productCount || 0} productos
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ProductForm Modal */}
      <ProductForm
        isOpen={showProductForm}
        onClose={() => {
          setShowProductForm(false);
          setSelectedProduct(null);
          setSelectedSubfamiliaForNewProduct(null); // 🆕 Limpiar subfamilia preseleccionada
          clearError();
        }}
        onSave={handleSaveProduct}
        mode={productFormMode}
        initialData={selectedProduct}
        subfamilias={getAllSubfamilias()}
        preSelectedSubfamilia={selectedSubfamiliaForNewProduct} // 🆕 Pasar subfamilia preseleccionada
        userRole={userRole}
      />
    </div>
  );
};

export default ProductsModule;