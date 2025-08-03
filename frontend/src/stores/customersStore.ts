// frontend/src/stores/customersStore.ts
import { create } from 'zustand';
import { API_URL, CONFIG, getRequestConfig } from '../config/config'; // ✅ IMPORTAR CONFIG

import type { 
  Customer, 
  CustomerFormData, 
  CustomerState, 
  CustomerActions, 
  CustomerFilters,
  CustomerPagination 
} from '../types/customer.types';

// ✅ REQUEST HELPER USANDO CONFIG CENTRALIZADA
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  console.log(`🌐 API Request (NO-CACHE): ${options.method || 'GET'} ${API_URL}${endpoint}`);
  
  const response = await fetch(`${API_URL}${endpoint}`, getRequestConfig(options));

  // Manejar token expirado usando URLs centralizadas
  if (response.status === 401) {
    try {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: CONFIG.HEADERS
      });

      if (refreshResponse.ok) {
        const { accessToken } = await refreshResponse.json();
        localStorage.setItem(CONFIG.TOKEN_KEY, accessToken);
        
        // Retry request con nuevo token
        return await fetch(`${API_URL}${endpoint}`, getRequestConfig(options));
      } else {
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        window.location.href = '/login';
        throw new Error('Sesión expirada');
      }
    } catch (error) {
      localStorage.removeItem(CONFIG.TOKEN_KEY);
      window.location.href = '/login';
      throw new Error('Sesión expirada');
    }
  }

  return response;
};

const initialState: Omit<CustomerState, keyof CustomerActions> = {
  customers: [],
  currentCustomer: null,
  
  filters: {
    search: '',
    tipo: 'all',
    sortBy: 'nom',
    sortOrder: 'asc'
  },
  
  pagination: {
    page: 1,
    limit: CONFIG.CUSTOMERS_PAGE_SIZE, // ✅ USAR CONFIG EN LUGAR DE HARDCODEAR
    total: 0,
    totalPages: 0
  },
  
  loading: {
    list: false,
    create: false,
    update: false,
    delete: false
  },
  
  error: null,
  isModalOpen: false,
  modalMode: 'create'
};

export const useCustomersStore = create<CustomerState & CustomerActions>()(
  (set, get) => ({
    ...initialState,

    fetchCustomers: async (filters) => {
      // Guard clause para evitar doble fetch
      if (get().loading.list) return;

      // Limpiar estado antes de fetch
      set(state => ({
        customers: [], // ← CRÍTICO: Lista vacía = UI limpia
        loading: { ...state.loading, list: true },
        error: null
      }));

      try {
        const currentFilters = get().filters;
        const mergedFilters = { ...currentFilters, ...filters };
        const { pagination } = get();

        // Cache buster con timestamp
        const timestamp = Date.now();
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
          search: mergedFilters.search,
          tipo: mergedFilters.tipo,
          sortBy: mergedFilters.sortBy,
          sortOrder: mergedFilters.sortOrder,
          _t: timestamp.toString() // ← Hace cada URL única en el tiempo
        });

        console.log('🔍 Fetching customers con timestamp:', timestamp);
        console.log('🎯 URL completa:', `${API_URL}/customers?${params.toString()}`);

        const response = await apiRequest(`/customers?${params}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Error de conexión' }));
          throw new Error(errorData.error || 'Error al cargar clientes');
        }

        const data = await response.json();

        // Log para debugging
        console.log('📥 DATOS FRESCOS RECIBIDOS:');
        if (data.customers && Array.isArray(data.customers)) {
          data.customers.forEach((customer: Customer, index: number) => {
            console.log(`👤 Cliente ${index + 1} [FRESCO]:`, {
              id: customer.id,
              nom: `"${customer.nom}"`,
              nom_length: customer.nom?.length || 0,
              tipo: customer.tipo,
              timestamp: timestamp // ← Para confirmar que son datos de ESTE fetch
            });
          });
        }

        // Actualización segura del estado
        set(state => ({
          customers: Array.isArray(data.customers) ? data.customers : [],
          pagination: {
            page: data.pagination?.page || 1,
            limit: data.pagination?.limit || CONFIG.CUSTOMERS_PAGE_SIZE, // ✅ USAR CONFIG
            total: data.pagination?.total || 0,
            totalPages: data.pagination?.totalPages || 0
          },
          filters: mergedFilters,
          loading: { ...state.loading, list: false },
          error: null
        }));

        console.log(`✅ Estado actualizado con ${data.customers?.length || 0} clientes FRESCOS`);

      } catch (error) {
        console.error('❌ Error al cargar clientes:', error);
        
        // Error handling defensivo
        set(state => ({
          customers: [], // ← Array vacío = UI muestra error, no datos viejos
          error: {
            message: error instanceof Error ? error.message : 'Error desconocido',
            field: 'general'
          },
          loading: { ...state.loading, list: false }
        }));
      }
    },

    updateCustomer: async (id, data) => {
      set(state => ({
        loading: { ...state.loading, update: true },
        error: null
      }));

      try {
        console.log(`✏️ Actualizando cliente ${id}:`, data);

        const response = await apiRequest(`/customers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar cliente');
        }

        const updatedCustomer = await response.json();
        console.log('✅ Cliente actualizado en API:', updatedCustomer);

        // Cerrar modal PRIMERO (UX inmediata)
        set(state => ({
          loading: { ...state.loading, update: false },
          isModalOpen: false,
          currentCustomer: null
        }));

        // ✅ DELAY USANDO CONFIG
        console.log(`⏳ Esperando ${CONFIG.DB_DELAY}ms para evitar race condition con PostgreSQL...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.DB_DELAY));
        
        // Limpieza forzada antes de re-fetch
        set(state => ({
          customers: [], // ← Forzar UI limpia
          pagination: { ...state.pagination, page: 1 } // ← Empezar desde el inicio
        }));
        
        console.log('🔄 Haciendo re-fetch FORZADO con datos garantizadamente frescos...');
        await get().fetchCustomers();

        return updatedCustomer;

      } catch (error) {
        console.error('❌ Error al actualizar cliente:', error);
        set(state => ({
          error: {
            message: error instanceof Error ? error.message : 'Error al actualizar cliente',
            field: 'update'
          },
          loading: { ...state.loading, update: false }
        }));
        throw error;
      }
    },

    createCustomer: async (data) => {
      set(state => ({
        loading: { ...state.loading, create: true },
        error: null
      }));

      try {
        const response = await apiRequest('/customers', {
          method: 'POST',
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al crear cliente');
        }

        const newCustomer = await response.json();

        set(state => ({
          loading: { ...state.loading, create: false },
          isModalOpen: false,
          currentCustomer: null
        }));

        // Delay menor para CREATE
        await new Promise(resolve => setTimeout(resolve, CONFIG.DB_DELAY / 2)); // ✅ 500ms usando CONFIG
        set(state => ({ customers: [] }));
        await get().fetchCustomers();

        return newCustomer;

      } catch (error) {
        set(state => ({
          error: {
            message: error instanceof Error ? error.message : 'Error al crear cliente',
            field: 'create'
          },
          loading: { ...state.loading, create: false }
        }));
        throw error;
      }
    },

    deleteCustomer: async (id) => {
      set(state => ({
        loading: { ...state.loading, delete: true },
        error: null
      }));

      try {
        const response = await apiRequest(`/customers/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al eliminar cliente');
        }

        set(state => ({
          loading: { ...state.loading, delete: false }
        }));

        // Delay aún menor para DELETE
        await new Promise(resolve => setTimeout(resolve, CONFIG.DB_DELAY / 3)); // ✅ 333ms usando CONFIG
        set(state => ({ customers: [] }));
        await get().fetchCustomers();

      } catch (error) {
        set(state => ({
          error: {
            message: error instanceof Error ? error.message : 'Error al eliminar cliente',
            field: 'delete'
          },
          loading: { ...state.loading, delete: false }
        }));
        throw error;
      }
    },

    setFilters: (newFilters) => {
      console.log('🔧 Cambiando filtros:', newFilters);
      
      const mergedFilters = { ...get().filters, ...newFilters };
      
      // Limpiar al cambiar filtros
      set(state => ({
        filters: mergedFilters,
        pagination: { ...state.pagination, page: 1 },
        customers: [] // ← CRÍTICO: Vaciar lista al cambiar filtro
      }));

      // Delay pequeño para evitar spam usando CONFIG
      setTimeout(async () => {
        await get().fetchCustomers();
      }, CONFIG.SEARCH_DEBOUNCE / 5); // ✅ 100ms usando CONFIG
    },

    setPagination: (newPagination) => {
      // Limpiar en paginación también
      set(state => ({
        pagination: { ...state.pagination, ...newPagination },
        customers: [] // ← Evita mostrar datos de página anterior
      }));

      setTimeout(async () => {
        await get().fetchCustomers();
      }, CONFIG.SEARCH_DEBOUNCE / 5); // ✅ 100ms usando CONFIG
    },

    searchCustomers: async (query) => {
      console.log('🔍 Búsqueda:', query);
      
      // Limpiar en búsqueda
      set(state => ({
        filters: { ...state.filters, search: query },
        pagination: { ...state.pagination, page: 1 },
        customers: [] // ← Limpiar resultados de búsqueda anterior
      }));

      await get().fetchCustomers();
    },

    // El resto de métodos no manejan datos, solo UI state (sin cambios)
    openModal: (mode, customer) => {
      set({
        isModalOpen: true,
        modalMode: mode,
        currentCustomer: customer || null,
        error: null
      });
    },

    closeModal: () => {
      set({
        isModalOpen: false,
        currentCustomer: null,
        error: null
      });
    },

    setCurrentCustomer: (customer) => {
      set({ currentCustomer: customer });
    },

    clearError: () => {
      set({ error: null });
    },

    resetFilters: () => {
      // Reset completo con limpieza
      set({
        filters: initialState.filters,
        pagination: { ...initialState.pagination },
        customers: [] // ← Reset visual también
      });

      setTimeout(async () => {
        await get().fetchCustomers();
      }, CONFIG.SEARCH_DEBOUNCE / 2.5); // ✅ 200ms usando CONFIG
    }
  })
);

// Selectores (sin cambios)
export const useCustomersData = () => {
  const customers = useCustomersStore(state => state.customers);
  console.log('🔍 useCustomersData called, returning:', customers.length, 'customers');
  return customers;
};

export const useCustomersLoading = () => useCustomersStore(state => state.loading);
export const useCustomersError = () => useCustomersStore(state => state.error);
export const useCustomersModal = () => useCustomersStore(state => ({
  isOpen: state.isModalOpen,
  mode: state.modalMode,
  customer: state.currentCustomer
}));

export const useCustomerActions = () => {
  const store = useCustomersStore();
  
  return {
    fetch: store.fetchCustomers,
    create: store.createCustomer,
    update: store.updateCustomer,
    delete: store.deleteCustomer,
    search: store.searchCustomers,
    setFilters: store.setFilters,        
    setPagination: store.setPagination,
    resetFilters: store.resetFilters,
    openModal: store.openModal,
    closeModal: store.closeModal,
    clearError: store.clearError
  };
};