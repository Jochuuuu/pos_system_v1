// frontend/src/stores/inventory/stockStore.ts
import { create } from 'zustand';
import type { Product } from '../../types/inventory.types';
import type { Customer } from '../../types/customer.types';
import { API_URL, CONFIG, getRequestConfig } from '../../config/config';

// =============================================
// INTERFACES
// =============================================
export interface StockEntryProduct {
  producto_cod: string;
  cantidad: number;
  precio_compra: number;
  precio_calculado_automaticamente: boolean;
}

export interface StockEntryRequest {
  cliente_id?: number;
  cliente_doc?: string;
  observaciones?: string;
  total_pagado: number;
  incluye_igv: boolean;
  productos: StockEntryProduct[];
}

export interface StockEntry {
  id: number;
  numero: number; // Número visible de la entrada
  fecha_entrada: string;
  cliente_id?: number;
  cliente_doc?: string;
  cliente_nom?: string;
  cliente_tipo?: string;
  observaciones?: string;
  subtotal: number;
  igv: number;
  total_pagado: number;
  incluye_igv: boolean;
  productos?: (StockEntryProduct & {
    id: number;
    descripcion: string;
    subtotal: number;
    stock_anterior: number;
    stock_nuevo: number;
  })[];
  total_productos: number;
  total_cantidad: number;
  usuario_nom?: string;
}

export interface StockEntryFilters {
  search?: string;
  cliente_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  incluye_igv?: boolean;
}

export interface StockEntryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface StockStats {
  periodo: string;
  estadisticas: {
    total_entradas: number;
    monto_total: number;
    promedio_entrada: number;
    entradas_con_igv: number;
    proveedores_distintos: number;
    productos_totales: number;
    cantidad_total: number;
  };
}

interface StockState {
  // Data
  entries: StockEntry[];
  products: Product[];
  customers: Customer[];
  stats: StockStats | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingProducts: boolean;
  isLoadingCustomers: boolean;
  isSubmitting: boolean;
  isLoadingStats: boolean;
  
  // Error states
  error: string | null;
  submitError: string | null;
  
  // Pagination & filters
  pagination: StockEntryPagination | null;
  filters: StockEntryFilters;
  
  // Actions - Stock Entries
  loadStockEntries: (filters?: StockEntryFilters, page?: number, limit?: number) => Promise<void>;
  createStockEntry: (data: StockEntryRequest) => Promise<{ success: boolean; entry?: StockEntry; error?: string }>;
  getStockEntry: (id: number) => Promise<{ success: boolean; entry?: StockEntry; error?: string }>;
  loadStockStats: (dias?: number) => Promise<void>;
  
  // Actions - Products & Customers
  loadProducts: (search?: string) => Promise<void>;
  loadCustomers: (search?: string) => Promise<void>;
  validateProduct: (cod: string) => Promise<{ success: boolean; product?: Product; error?: string }>;
  searchCustomerByDoc: (doc: string) => Promise<{ success: boolean; customer?: Customer; error?: string }>;
  
  // Actions - Filters & Navigation
  setFilters: (filters: StockEntryFilters) => void;
  clearFilters: () => void;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  
  // Actions - Error handling
  clearError: () => void;
  clearSubmitError: () => void;
  setError: (error: string) => void;
}

// =============================================
// URLs CENTRALIZADAS
// =============================================
const STOCK_API = `${API_URL}/inventory/stock`;
const PRODUCTS_API = `${API_URL}/inventory/products`;
const CUSTOMERS_API = `${API_URL}/customers`;

// =============================================
// REQUEST HELPER
// =============================================
const apiRequest = async (baseUrl: string, endpoint: string, options: RequestInit = {}) => {
  console.log(`🌐 Stock API Request: ${options.method || 'GET'} ${baseUrl}${endpoint}`);
  
  const response = await fetch(`${baseUrl}${endpoint}`, getRequestConfig(options));

  // Auto refresh si 401
  if (response.status === 401) {
    try {
      console.log('🔄 Token expirado, intentando refresh...');
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: CONFIG.HEADERS
      });

      if (refreshResponse.ok) {
        const { accessToken } = await refreshResponse.json();
        localStorage.setItem(CONFIG.TOKEN_KEY, accessToken);
        console.log('✅ Token refrescado exitosamente');
        
        // Retry request original
        return await fetch(`${baseUrl}${endpoint}`, getRequestConfig(options));
      } else {
        console.log('❌ Refresh fallido, redirigiendo a login');
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        window.location.href = '/login';
        throw new Error('Sesión expirada');
      }
    } catch (error) {
      console.error('❌ Error en refresh:', error);
      localStorage.removeItem(CONFIG.TOKEN_KEY);
      window.location.href = '/login';
      throw new Error('Sesión expirada');
    }
  }

  return response;
};

// Handler de respuestas
const handleApiResponse = async (response: Response) => {
  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('No autorizado. Sesión refrescada automáticamente.');
    }
    throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
  }
  
  return data;
};

// Helper para construir query parameters
const buildQueryParams = (filters: StockEntryFilters, page?: number, limit?: number): string => {
  const params = new URLSearchParams();
  
  if (page) params.set('page', page.toString());
  if (limit) params.set('limit', limit.toString());
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.cliente_id) params.set('cliente_id', filters.cliente_id.toString());
  if (filters.fecha_desde) params.set('fecha_desde', filters.fecha_desde);
  if (filters.fecha_hasta) params.set('fecha_hasta', filters.fecha_hasta);
  if (filters.incluye_igv !== undefined) params.set('incluye_igv', filters.incluye_igv.toString());
  
  // Cache buster
  params.set('_t', Date.now().toString());
  
  return params.toString();
};

// =============================================
// ZUSTAND STORE
// =============================================
export const useStockStore = create<StockState>((set, get) => ({
  // Estado inicial
  entries: [],
  products: [],
  customers: [],
  stats: null,
  isLoading: false,
  isLoadingProducts: false,
  isLoadingCustomers: false,
  isSubmitting: false,
  isLoadingStats: false,
  error: null,
  submitError: null,
  pagination: null,
  filters: {},

  // =============================================
  // LOAD STOCK ENTRIES
  // =============================================
  loadStockEntries: async (filters = {}, page = 1, limit = CONFIG.PAGE_SIZE) => {
    set({ isLoading: true, error: null });
    
    try {
      const queryParams = buildQueryParams(filters, page, limit);
      const url = queryParams ? `?${queryParams}` : '';
      
      const response = await apiRequest(STOCK_API, url, { method: 'GET' });
      const data = await handleApiResponse(response);
      
      set({ 
        entries: data.entries || [],
        pagination: data.pagination || null,
        filters: { ...filters },
        isLoading: false,
        error: null 
      });
      
      console.log('✅ Entradas de stock cargadas:', data.entries?.length || 0, 'entradas');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar entradas de stock';
      set({ 
        isLoading: false, 
        error: errorMessage,
        entries: [],
        pagination: null
      });
      console.error('❌ Error cargando entradas:', errorMessage);
    }
  },

  // =============================================
  // CREATE STOCK ENTRY
  // =============================================
  createStockEntry: async (data: StockEntryRequest) => {
    set({ isSubmitting: true, submitError: null });
    
    try {
      const response = await apiRequest(STOCK_API, '', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      const result = await handleApiResponse(response);
      console.log('✅ Entrada de stock creada:', result.entry.numero);
      
      // Re-fetch entradas para mantener consistencia
      const currentState = get();
      await get().loadStockEntries(currentState.filters, currentState.pagination?.page || 1);
      
      set({ isSubmitting: false, submitError: null });
      return { success: true, entry: result.entry };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear entrada de stock';
      set({ isSubmitting: false, submitError: errorMessage });
      console.error('❌ Error creando entrada:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // =============================================
  // GET SINGLE STOCK ENTRY
  // =============================================
  getStockEntry: async (id: number) => {
    if (!id) {
      return { success: false, error: 'ID de entrada requerido' };
    }

    try {
      const response = await apiRequest(STOCK_API, `/${id}`, { method: 'GET' });
      const data = await handleApiResponse(response);
      
      console.log('✅ Entrada obtenida:', data.entry.numero);
      return { success: true, entry: data.entry };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al obtener entrada';
      console.error('❌ Error obteniendo entrada:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // =============================================
  // LOAD STOCK STATS
  // =============================================
  loadStockStats: async (dias = 30) => {
    set({ isLoadingStats: true });
    
    try {
      const params = new URLSearchParams();
      params.set('dias', dias.toString());
      params.set('_t', Date.now().toString());
      
      const response = await apiRequest(STOCK_API, `/stats/summary?${params.toString()}`, { method: 'GET' });
      const data = await handleApiResponse(response);
      
      set({ 
        stats: data,
        isLoadingStats: false
      });
      
      console.log('✅ Estadísticas de stock cargadas:', data.periodo);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar estadísticas';
      set({ 
        isLoadingStats: false,
        stats: null
      });
      console.error('❌ Error cargando estadísticas:', errorMessage);
    }
  },

  // =============================================
  // LOAD PRODUCTS (reutilizando API existente)
  // =============================================
  loadProducts: async (search = '') => {
    set({ isLoadingProducts: true });
    
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      params.set('activo', 'true'); // Solo productos activos
      params.set('limit', '1000'); // Cargar todos para el formulario
      params.set('_t', Date.now().toString());
      
      const queryString = params.toString();
      const url = queryString ? `?${queryString}` : '';
      
      const response = await apiRequest(PRODUCTS_API, url, { method: 'GET' });
      const data = await handleApiResponse(response);
      
      set({ 
        products: data.products || [],
        isLoadingProducts: false
      });
      
      console.log('✅ Productos cargados para stock:', data.products?.length || 0, 'productos');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar productos';
      set({ 
        isLoadingProducts: false,
        products: []
      });
      console.error('❌ Error cargando productos:', errorMessage);
    }
  },

  // =============================================
  // LOAD CUSTOMERS (reutilizando API existente)
  // =============================================
  loadCustomers: async (search = '') => {
    set({ isLoadingCustomers: true });
    
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', '500'); // Cargar suficientes para el formulario
      params.set('_t', Date.now().toString());
      
      const queryString = params.toString();
      const url = queryString ? `?${queryString}` : '';
      
      const response = await apiRequest(CUSTOMERS_API, url, { method: 'GET' });
      const data = await handleApiResponse(response);
      
      set({ 
        customers: data.customers || [],
        isLoadingCustomers: false
      });
      
      console.log('✅ Clientes cargados para stock:', data.customers?.length || 0, 'clientes');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar clientes';
      set({ 
        isLoadingCustomers: false,
        customers: []
      });
      console.error('❌ Error cargando clientes:', errorMessage);
    }
  },

  // =============================================
  // VALIDATE PRODUCT (reutilizando API existente)
  // =============================================
  validateProduct: async (cod: string) => {
    if (!cod?.trim()) {
      return { success: false, error: 'Código de producto requerido' };
    }

    try {
      const response = await apiRequest(PRODUCTS_API, `/${encodeURIComponent(cod.trim())}`, { method: 'GET' });
      const data = await handleApiResponse(response);
      
      console.log('✅ Producto validado:', data.product.descripcion);
      return { success: true, product: data.product };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Producto no encontrado';
      console.error('❌ Error validando producto:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // =============================================
  // SEARCH CUSTOMER BY DOCUMENT (usando nuevo endpoint)
  // =============================================
  searchCustomerByDoc: async (doc: string) => {
    if (!doc?.trim()) {
      return { success: false, error: 'Documento requerido' };
    }

    try {
      const response = await apiRequest(CUSTOMERS_API, `/by-document/${encodeURIComponent(doc.trim())}`, { method: 'GET' });
      const data = await handleApiResponse(response);
      
      console.log('✅ Cliente encontrado por documento:', data.customer.nom);
      return { success: true, customer: data.customer };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Cliente no encontrado';
      console.error('❌ Cliente no encontrado por documento:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // =============================================
  // FILTERS & NAVIGATION
  // =============================================
  setFilters: (filters: StockEntryFilters) => {
    set({ filters: { ...filters } });
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  nextPage: async () => {
    const { pagination, filters } = get();
    if (pagination && pagination.hasNext) {
      await get().loadStockEntries(filters, pagination.page + 1);
    }
  },

  prevPage: async () => {
    const { pagination, filters } = get();
    if (pagination && pagination.hasPrev) {
      await get().loadStockEntries(filters, pagination.page - 1);
    }
  },

  goToPage: async (page: number) => {
    const { filters } = get();
    await get().loadStockEntries(filters, page);
  },

  // =============================================
  // ERROR HANDLING
  // =============================================
  clearError: () => set({ error: null }),
  clearSubmitError: () => set({ submitError: null }),
  setError: (error: string) => set({ error }),
}));