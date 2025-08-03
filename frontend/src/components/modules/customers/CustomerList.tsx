// frontend/src/components/modules/customers/CustomerList.tsx - PROBLEMA SOLUCIONADO
import React, { useEffect, useState } from 'react';
import { 
  useCustomersStore, 
  useCustomersData, 
  useCustomersLoading, 
  useCustomerActions 
} from '../../../stores/customersStore';
import type { Customer } from '../../../types/customer.types';
import CustomerSearch from './CustomerSearch';
import CustomerForm from './CustomerForm';
import '../../../styles/customers.css';

const CustomerList: React.FC = () => {
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
  
  // 🎯 Estados del store
  const customers = useCustomersData(); // ← ESTOS SON LOS DATOS YA FILTRADOS POR EL BACKEND
  const loading = useCustomersLoading();
  const filters = useCustomersStore(state => state.filters);
  const pagination = useCustomersStore(state => state.pagination);
  const isModalOpen = useCustomersStore(state => state.isModalOpen);
  const modalMode = useCustomersStore(state => state.modalMode);
  const currentCustomer = useCustomersStore(state => state.currentCustomer);
  const error = useCustomersStore(state => state.error);
  
  // 🚀 Acciones del store
  const actions = useCustomerActions();

  // ⚡ Cargar clientes al iniciar
  useEffect(() => {
    console.log('🎬 Iniciando CustomerList - Cargando clientes...');
    actions.fetch();
  }, []);

  // 🚨 PROBLEMA SOLUCIONADO: NO MÁS FILTRADO LOCAL
  // ❌ ANTES teníamos esto (causaba el bug):
  // const filteredCustomers = useMemo(() => {
  //   if (!filters.search) return customers;
  //   return customers.filter(customer => ...); ← ESTO CAUSABA EL PROBLEMA
  // }, [customers, filters.search]);

  // ✅ AHORA: Usamos directamente los datos del backend (ya filtrados)
  const displayCustomers = customers; // ← SIMPLE: Los datos ya vienen filtrados del backend

  // 🎛️ Handlers de selección
  const handleSelectCustomer = (customerId: number) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedCustomers.size === displayCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(displayCustomers.map(c => c.id)));
    }
  };

  // 🛠️ Handlers de acciones
  const handleEdit = (customer: Customer) => {
    console.log('✏️ Editando cliente:', customer.nom);
    actions.openModal('edit', customer);
  };

  const handleView = (customer: Customer) => {
    console.log('👁️ Viendo cliente:', customer.nom);
    actions.openModal('view', customer);
  };

  const handleDelete = async (customer: Customer) => {
    const confirmMessage = `¿Estás seguro de eliminar a "${customer.nom}"?`;
    
    if (window.confirm(confirmMessage)) {
      console.log('🗑️ Eliminando cliente:', customer.nom);
      
      try {
        await actions.delete(customer.id);
        
        // Limpiar selección si estaba seleccionado
        setSelectedCustomers(prev => {
          const newSet = new Set(prev);
          newSet.delete(customer.id);
          return newSet;
        });
        
        console.log('✅ Cliente eliminado exitosamente');
      } catch (error) {
        console.error('❌ Error al eliminar cliente:', error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCustomers.size === 0) return;
    
    const confirmMessage = `¿Eliminar ${selectedCustomers.size} cliente(s) seleccionado(s)?`;
    
    if (window.confirm(confirmMessage)) {
      console.log(`🗑️ Eliminación masiva: ${selectedCustomers.size} clientes`);
      
      try {
        // Eliminar uno por uno
        for (const id of selectedCustomers) {
          await actions.delete(id);
        }
        
        setSelectedCustomers(new Set());
        console.log('✅ Eliminación masiva completada');
      } catch (error) {
        console.error('❌ Error en eliminación masiva:', error);
      }
    }
  };

  // 🎨 Handlers de filtros - SIMPLIFICADOS
  const handleFilterChange = (filterType: string, value: string) => {
    console.log(`🔧 Cambiando filtro ${filterType}:`, value);
    console.log('📊 Estado actual antes del cambio:', {
      filtroActual: filters.tipo,
      clientesEnPantalla: displayCustomers.length,
      primerCliente: displayCustomers[0]?.nom
    });
    
    if (filterType === 'tipo') {
      actions.setFilters({ tipo: value as any });
    } else if (filterType === 'sort') {
      const [sortBy, sortOrder] = value.split('-');
      actions.setFilters({ 
        sortBy: sortBy as any, 
        sortOrder: sortOrder as any 
      });
    }
  };

  // 🔍 Handler de búsqueda - SIMPLIFICADO
  const handleSearch = async (query: string) => {
    console.log('🔍 Búsqueda ejecutada:', `"${query}"`);
    console.log('📊 Estado antes de buscar:', {
      filtroTipo: filters.tipo,
      clientesActuales: displayCustomers.length
    });
    
    await actions.search(query);
    
    // Log después de la búsqueda
    setTimeout(() => {
      console.log('📊 Estado después de buscar:', {
        filtroTipo: filters.tipo,
        clientesResultado: displayCustomers.length,
        query: filters.search
      });
    }, 500);
  };

  return (
    <div className="customers-container">
      {/* 📋 Header principal */}
      <div className="customers-header">
        <div className="header-left">
          <h2 className="section-title">Gestión de Clientes</h2>
          <p className="section-subtitle">
            {pagination.total} cliente(s) registrado(s)
            {filters.tipo !== 'all' && ` • Filtro: ${filters.tipo === 'P' ? 'Personas' : 'Empresas'}`}
            {filters.search && ` • Búsqueda: "${filters.search}"`}
          </p>
        </div>
        
        <div className="header-actions">
          <CustomerSearch 
            onSearch={handleSearch}
            placeholder="Buscar por nombre, documento, email..."
          />
          
          <button 
            className="btn btn-primary"
            onClick={() => actions.openModal('create')}
            disabled={loading.create}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* 🚨 Mensaje de error */}
      {error && (
        <div className="alert alert-error">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error.message}</span>
            <button 
              onClick={actions.clearError}
              className="ml-auto text-sm underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* 🎛️ Barra de filtros */}
      <div className="customers-toolbar">
        <div className="toolbar-filters">
          <select 
            value={filters.tipo}
            onChange={(e) => handleFilterChange('tipo', e.target.value)}
            className="filter-select"
            disabled={loading.list}
          >
            <option value="all">Todos los tipos</option>
            <option value="P">Personas</option>
            <option value="E">Empresas</option>
          </select>
          
          <select 
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="filter-select"
            disabled={loading.list}
          >
            <option value="nom-asc">Nombre A-Z</option>
            <option value="nom-desc">Nombre Z-A</option>
            <option value="doc-asc">Documento A-Z</option>
            <option value="doc-desc">Documento Z-A</option>
          </select>
{/*
          <button 
            onClick={actions.resetFilters}
            className="btn btn-sm btn-secondary"
            disabled={loading.list}
          >
            Limpiar Filtros
          </button>*/}

          {/* 🔍 INDICADOR DE ESTADO ACTUAL */}
    <div className={`status-indicator ${
  loading.list ? 'loading' : 
  displayCustomers.length === 0 ? 'empty' : 
  filters.search || filters.tipo !== 'all' ? 'filtered' : 
  ''
}`}>
  <span className="status-indicator-icon">
    {loading.list ? '⏳' : 
     displayCustomers.length === 0 ? '📭' : 
     filters.search || filters.tipo !== 'all' ? '🔍' : 
     '📊'}
  </span>
  
  {loading.list ? (
    'Cargando clientes...'
  ) : displayCustomers.length === 0 ? (
    'Sin resultados'
  ) : (
    <>
      Mostrando: {displayCustomers.length} de {pagination.total}
      {(filters.search || filters.tipo !== 'all') && ' (filtrado)'}
    </>
  )}
</div>
        </div>

        {/* Acciones masivas */}
        {selectedCustomers.size > 0 && (
          <div className="bulk-actions">
            <span className="selected-count">
              {selectedCustomers.size} seleccionado(s)
            </span>
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => setSelectedCustomers(new Set())}
            >
              Deseleccionar
            </button>
            <button 
              className="btn btn-sm btn-danger"
              onClick={handleBulkDelete}
              disabled={loading.delete}
            >
              {loading.delete ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        )}
      </div>

      {/* 📋 Contenido principal */}
      <div className="customers-table-container">
        {loading.list ? (
          // 🔄 Estado de carga
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando clientes...</p>
          </div>
        ) : displayCustomers.length === 0 ? (
          // 📭 Estado vacío
          <div className="empty-state">
            <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3>No hay clientes</h3>
            <p>
              {filters.search ? 
                `No se encontraron clientes que coincidan con "${filters.search}"` :
                filters.tipo !== 'all' ?
                `No hay clientes de tipo ${filters.tipo === 'P' ? 'Persona' : 'Empresa'}` :
                'Comienza agregando tu primer cliente'
              }
            </p>
            {!filters.search && filters.tipo === 'all' && (
              <button 
                className="btn btn-primary"
                onClick={() => actions.openModal('create')}
              >
                Agregar Cliente
              </button>
            )}
          </div>
        ) : (
          // 📊 Tabla de clientes
          <div className="table-wrapper">
            <table className="customers-table">
              <thead>
                <tr>
                  <th className="table-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.size === displayCustomers.length && displayCustomers.length > 0}
                      onChange={handleSelectAll}
                      className="checkbox"
                    />
                  </th>
                  <th>Documento</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th className="table-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {displayCustomers.map((customer) => (
                  <tr 
                    key={customer.id}
                    className={selectedCustomers.has(customer.id) ? 'row-selected' : ''}
                  >
                    <td className="table-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(customer.id)}
                        onChange={() => handleSelectCustomer(customer.id)}
                        className="checkbox"
                      />
                    </td>
                    <td className="customer-doc">
                      <span className="doc-text">{customer.doc || 'N/A'}</span>
                    </td>
                    <td className="customer-name">
                      <div className="name-container">
                        <span className="name-text">{customer.nom || 'Sin nombre'}</span>
                        {customer.dir && (
                          <span className="address-text">{customer.dir}</span>
                        )}
                      </div>
                    </td>
                    <td className="customer-type">
                      <span className={`type-badge type-${customer.tipo}`}>
                        {customer.tipo === 'P' ? 'Persona' : 'Empresa'}
                      </span>
                    </td>
                    <td className="customer-phone">
                      <span className="phone-text">{customer.telefono || 'N/A'}</span>
                    </td>
                    <td className="customer-email">
                      <span className="email-text">{customer.email || 'N/A'}</span>
                    </td>
                    <td className="table-actions">
                      <div className="action-buttons">
                        <button
                          className="btn-icon btn-icon-secondary"
                          onClick={() => handleView(customer)}
                          title="Ver detalles"
                          disabled={loading.update || loading.delete}
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        
                        <button
                          className="btn-icon btn-icon-primary"
                          onClick={() => handleEdit(customer)}
                          title="Editar"
                          disabled={loading.update || loading.delete}
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDelete(customer)}
                          title="Eliminar"
                          disabled={loading.update || loading.delete}
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 📄 Paginación */}
      {pagination.totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
          </div>
          
          <div className="pagination-controls">
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => actions.setPagination({ page: pagination.page - 1 })}
              disabled={pagination.page <= 1 || loading.list}
            >
              Anterior
            </button>
            
            <div className="pagination-numbers">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, pagination.page - 2) + i;
                if (pageNum > pagination.totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    className={`btn btn-sm ${pageNum === pagination.page ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => actions.setPagination({ page: pageNum })}
                    disabled={loading.list}
                  >
                    {pageNum}
                  </button>
                );
              }).filter(Boolean)}
            </div>
            
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => actions.setPagination({ page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages || loading.list}
            >
              Siguiente
            </button>
          </div>
          
          <div className="pagination-size">
            <select
              value={pagination.limit}
              onChange={(e) => actions.setPagination({ limit: Number(e.target.value), page: 1 })}
              className="pagination-select"
              disabled={loading.list}
            >
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </div>
        </div>
      )}

      {/* 📝 Modal de formulario */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={actions.closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create' && 'Nuevo Cliente'}
                {modalMode === 'edit' && 'Editar Cliente'}
                {modalMode === 'view' && 'Detalles del Cliente'}
              </h3>
              <button 
                className="modal-close"
                onClick={actions.closeModal}
                disabled={loading.create || loading.update}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <CustomerForm
                customer={currentCustomer}
                onSubmit={modalMode === 'create' ? actions.create : 
                         modalMode === 'edit' ? (data) => actions.update(currentCustomer!.id, data) :
                         async () => {}}
                onCancel={actions.closeModal}
                loading={modalMode === 'create' ? loading.create : loading.update}
                readonly={modalMode === 'view'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;