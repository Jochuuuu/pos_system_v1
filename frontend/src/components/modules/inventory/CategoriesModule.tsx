// frontend/src/components/modules/inventory/CategoriesModule.tsx
// USANDO ZUSTAND STORE - CON SISTEMA DE PERMISOS + BOTÓN VER PRODUCTOS
import React, { useState, useEffect } from 'react';
import CategoryForm from './categories/CategoryForm';
import SimpleDeleteConfirmation from './categories/SimpleDeleteConfirmation';
import { useCategoriesStore } from '../../../stores/inventory/categoriesStore';
import { useAuthStore } from '../../../stores/authStore';  // 🔐 IMPORTAR AuthStore
import type { Familia, Subfamilia } from '../../../types/inventory.types'; // 🆕 IMPORTAR TIPOS

// 🆕 AGREGAR PROPS PARA COMUNICACIÓN CON InventoryDashboard
interface CategoriesModuleProps {
  onViewProducts?: (subfamily: Subfamilia, family: Familia) => void;
}

const CategoriesModule: React.FC<CategoriesModuleProps> = ({ onViewProducts }) => {
  // 🔐 OBTENER ROL DEL USUARIO DESDE AuthStore
  const { user } = useAuthStore();
  const userRole = user?.role as 'A' | 'S' | 'C' || 'C'; // Fallback a Cajero

  // 🔐 SISTEMA DE PERMISOS - Configuración centralizada
  const permissions = {
    canCreate: userRole === 'A' || userRole === 'S',        // Admin y Supervisor pueden crear
    canEdit: userRole === 'A' || userRole === 'S',          // Admin y Supervisor pueden editar
    canDelete: userRole === 'A',                            // Solo Admin puede eliminar
    canView: true                                           // Todos pueden ver
  };

  // 🏪 Zustand Store
  const {
    familias,
    isLoading,
    error,
    loadCategories,
    createFamily,
    updateFamily,
    deleteFamily,
    createSubfamily,
    updateSubfamily,
    deleteSubfamily,
    toggleFamilyExpansion,
    clearError
  } = useCategoriesStore();

  // Estados locales solo para UI
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formMode, setFormMode] = useState<'create-family' | 'edit-family' | 'create-subfamily' | 'edit-subfamily'>('create-family');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedFamily, setSelectedFamily] = useState<Familia | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{item: any, type: 'familia' | 'subfamilia'} | null>(null);

  // Cargar categorías al montar
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // =============================================
  // 📝 HANDLERS DEL FORMULARIO - CON PERMISOS
  // =============================================
  const openForm = (mode: typeof formMode, item?: any, family?: Familia) => {
    // 🔐 Verificar permisos antes de abrir formulario
    if (mode.includes('create') && !permissions.canCreate) {
      console.warn('Sin permisos para crear');
      return;
    }
    if (mode.includes('edit') && !permissions.canEdit) {
      console.warn('Sin permisos para editar');
      return;
    }

    setFormMode(mode);
    setEditingItem(item || null);
    setSelectedFamily(family || null);
    clearError();
    setShowForm(true);
  };

  const handleFormSave = async (data: any) => {
    let result;
    
    switch (formMode) {
      case 'create-family':
        if (!permissions.canCreate) return;
        result = await createFamily(data.nom);
        break;
      case 'edit-family':
        if (!permissions.canEdit) return;
        result = await updateFamily(editingItem.id, data.nom);
        break;
      case 'create-subfamily':
        if (!permissions.canCreate) return;
        result = await createSubfamily(selectedFamily!.id, data.nom);
        break;
      case 'edit-subfamily':
        if (!permissions.canEdit) return;
        // 🆕 Pasar familia solo si cambió
        const famIdToSend = data.fam_id !== selectedFamily?.id ? data.fam_id : undefined;
        result = await updateSubfamily(editingItem.id, data.nom, famIdToSend);
        break;
    }

    if (result?.success) {
      setShowForm(false);
    }
    // Si hay error, se maneja automáticamente en el store
  };

  // =============================================
  // 🗑️ HANDLERS DE ELIMINACIÓN - CON PERMISOS
  // =============================================
  const openDeleteModal = (item: any, type: 'familia' | 'subfamilia') => {
    // 🔐 Verificar permisos antes de abrir modal
    if (!permissions.canDelete) {
      console.warn('Sin permisos para eliminar');
      return;
    }

    setDeleteTarget({ item, type });
    clearError();
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !permissions.canDelete) return;

    let result;
    if (deleteTarget.type === 'familia') {
      result = await deleteFamily(deleteTarget.item.id);
    } else {
      result = await deleteSubfamily(deleteTarget.item.id);
    }

    if (result?.success) {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  // =============================================
  // 🆕 HANDLER VER PRODUCTOS
  // =============================================
  const handleViewProducts = (subfamilia: Subfamilia, familia: Familia) => {
    console.log('🚀 Navegando a productos:', subfamilia.nom, 'de familia:', familia.nom);
    if (onViewProducts) {
      onViewProducts(subfamilia, familia);
    }
  };

  // =============================================
  // 🔍 FILTRADO
  // =============================================
  const filteredCategorias = familias.filter(familia =>
    familia.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    familia.subfamilias.some(sub => 
      sub.nom.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Obtener elementos existentes para validación
  const getExistingItems = () => {
    if (formMode.includes('family')) {
      return familias;
    } else if (selectedFamily) {
      const currentFamily = familias.find(f => f.id === selectedFamily.id);
      return currentFamily?.subfamilias || [];
    }
    return [];
  };

  // =============================================
  // 🎨 RENDER
  // =============================================
  return (
    <div className="categories-module">
      {/* Header */}
      <div className="module-header">
        <div className="module-header__content">
          <div className="module-header__left">
            <h2 className="module-title">Gestión de Categorías</h2>
            <p className="module-description">Administra familias y subfamilias</p>
            {/* 🔍 DEBUG: Mostrar rol actual (quitar en producción) */}
            <small style={{ color: '#666', fontSize: '0.75rem' }}>
              Usuario: {user?.name} | Rol: {userRole} | 
              Crear: {permissions.canCreate ? '✅' : '❌'} | 
              Editar: {permissions.canEdit ? '✅' : '❌'} | 
              Eliminar: {permissions.canDelete ? '✅' : '❌'}
            </small>
          </div>
          
          {/* 🔐 Botón solo visible si tiene permisos */}
          {permissions.canCreate && (
            <button 
              className="btn btn--primary"
              onClick={() => openForm('create-family')}
              disabled={isLoading}
            >
              Nueva Familia
            </button>
          )}
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

      {/* Búsqueda */}
      <div className="categories-toolbar">
        <div className="search-container">
          <div className="search-input-wrapper">
            <svg className="search-input__icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar categorías..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
        <button 
          className="btn btn--secondary btn--sm"
          onClick={() => loadCategories()}
          disabled={isLoading}
        >
          {isLoading ? '🔄 Cargando...' : '🔄 Recargar'}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="loading-state">
          <span className="loading-spinner"></span>
          <span>Cargando categorías...</span>
        </div>
      )}

      {/* Lista de categorías */}
      {!isLoading && (
        <div className="categories-tree">
          {filteredCategorias.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon">📁</span>
              <p className="empty-state__title">No hay categorías</p>
              <p className="empty-state__description">
                {searchTerm ? 'No se encontraron resultados' : 
                 permissions.canCreate ? 'Comienza creando tu primera familia' : 
                 'No hay categorías disponibles'}
              </p>
            </div>
          ) : (
            filteredCategorias.map((familia) => (
              <div key={familia.id} className="category-tree-item">
                <div className={`category-family ${familia.expanded ? 'expanded' : ''}`}>
                  <div className="category-family__header">
                    <button
                      className="category-expand-btn"
                      onClick={() => toggleFamilyExpansion(familia.id)}
                    >
                      <svg 
                        className={`category-expand-icon ${familia.expanded ? 'expanded' : ''}`}
                        width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                    
                    <div className="category-family__info">
                      <div className="category-family__content">
                        <h3 className="category-family__name">{familia.nom}</h3>
                        <span className="category-family__count">{familia.subfamilias.length} subfamilias</span>
                      </div>
                    </div>

                    {/* 🔐 Acciones con permisos aplicados */}
                    <div className="category-family__actions">
                      {/* Crear subfamilia - Admin y Supervisor */}
                      {permissions.canCreate && (
                        <button
                          className="action-btn action-btn--success"
                          onClick={() => openForm('create-subfamily', null, familia)}
                          title="Nueva subfamilia"
                        >
                          ➕
                        </button>
                      )}
                      
                      {/* Editar familia - Admin y Supervisor */}
                      {permissions.canEdit && (
                        <button
                          className="action-btn action-btn--primary"
                          onClick={() => openForm('edit-family', familia)}
                          title="Editar familia"
                        >
                          ✏️
                        </button>
                      )}
                      
                      {/* Eliminar familia - Solo Admin */}
                      {permissions.canDelete && (
                        <button
                          className="action-btn action-btn--danger"
                          onClick={() => openDeleteModal(familia, 'familia')}
                          title="Eliminar familia"
                          disabled={familia.subfamilias.length > 0}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subfamilias */}
                  {familia.expanded && (
                    <div className="category-subfamilies">
                      {familia.subfamilias.map((subfamilia) => (
                        <div key={subfamilia.id} className="category-subfamily">
                          <div className="category-subfamily__info">
                            <div className="category-subfamily__content">
                              <h4 className="category-subfamily__name">{subfamilia.nom}</h4>
                              <span className="category-subfamily__count">
                                {subfamilia.productCount || 0} productos
                              </span>
                            </div>
                          </div>

                          {/* 🔐 Acciones de subfamilia con permisos */}
                          <div className="category-subfamily__actions">
                            {/* 🆕 BOTÓN VER PRODUCTOS - Todos pueden ver */}
                            {permissions.canView && onViewProducts && (
                              <button
                                className="action-btn action-btn--info action-btn--sm"
                                onClick={() => handleViewProducts(subfamilia, familia)}
                                title={`Ver productos de ${subfamilia.nom}`}
                              >
                                📦
                              </button>
                            )}
                            
                            {/* Editar subfamilia - Admin y Supervisor */}
                            {permissions.canEdit && (
                              <button
                                className="action-btn action-btn--primary action-btn--sm"
                                onClick={() => openForm('edit-subfamily', subfamilia, familia)}
                                title="Editar subfamilia"
                              >
                                ✏️
                              </button>
                            )}
                            
                            {/* Eliminar subfamilia - Solo Admin */}
                            {permissions.canDelete && (
                              <button
                                className="action-btn action-btn--danger action-btn--sm"
                                onClick={() => openDeleteModal(subfamilia, 'subfamilia')}
                                title="Eliminar subfamilia"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 🔐 Formulario unificado - Solo mostrar si tiene permisos */}
      {(permissions.canCreate || permissions.canEdit) && (
        <CategoryForm
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            clearError();
          }}
          onSave={handleFormSave}
          mode={formMode}
          initialData={editingItem}
          selectedFamily={selectedFamily}
          familias={familias}
          existingItems={getExistingItems()}
          userRole={userRole}  // 🔐 Pasar rol al formulario
        />
      )}

      {/* 🔐 Confirmación de eliminación - Solo mostrar si tiene permisos */}
      {deleteTarget && permissions.canDelete && (
        <SimpleDeleteConfirmation
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteTarget(null);
            clearError();
          }}
          onConfirm={handleDelete}
          itemName={deleteTarget.item.nom}
          itemType={deleteTarget.type}
          canDelete={deleteTarget.type === 'familia' ? deleteTarget.item.subfamilias.length === 0 : true}
          blockedReason={
            deleteTarget.type === 'familia' && deleteTarget.item.subfamilias.length > 0
              ? `No se puede eliminar: tiene ${deleteTarget.item.subfamilias.length} subfamilias asociadas`
              : undefined
          }
          userRole={userRole}  // 🔐 Pasar rol al modal
        />
      )}
    </div>
  );
};

export default CategoriesModule;