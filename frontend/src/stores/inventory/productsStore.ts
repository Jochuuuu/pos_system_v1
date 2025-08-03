// frontend/src/stores/inventory/productsStore.ts
import { create } from 'zustand';
import type { Product } from '../../types/inventory.types';
import { API_URL, CONFIG, getRequestConfig } from '../../config/config'; // ✅ IMPORTAR CONFIG

// =============================================
// INTERFACES (sin cambios)
// =============================================
interface ProductFilters {
  search?: string;
  sub_id?: number;
  fam_id?: number;
  activo?: boolean;
  includeInactive?: boolean;
}

interface ProductPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ProductsState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  pagination: ProductPagination | null;
  filters: ProductFilters;
  
  loadProducts: (filters?: ProductFilters, page?: number, limit?: number) => Promise<void>;
  getProduct: (cod: string) => Promise<{ success: boolean; product?: Product; error?: string }>;
  createProduct: (productData: Omit<Product, 'subfamilia'>) => Promise<{ success: boolean; error?: string }>;
  updateProduct: (cod: string, productData: Partial<Product>) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (cod: string) => Promise<{ success: boolean; error?: string }>;
  
  setFilters: (filters: ProductFilters) => void;
  clearFilters: () => void;
  clearError: () => void;
  setError: (error: string) => void;
  
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
}

// =============================================
// ✅ URL CENTRALIZADA
// =============================================
const PRODUCTS_API = `${API_URL}/inventory/products`;

// =============================================
// ✅ REQUEST HELPER SIMPLIFICADO
// =============================================
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  console.log(`🌐 Products API Request: ${options.method || 'GET'} ${endpoint}`);
  
  const response = await fetch(`${PRODUCTS_API}${endpoint}`, getRequestConfig(options));

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
        return await fetch(`${PRODUCTS_API}${endpoint}`, getRequestConfig(options));
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

// Handler de respuestas (sin cambios)
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

// Helper para construir query parameters (sin cambios)
const buildQueryParams = (filters: ProductFilters, page?: number, limit?: number): string => {
  const params = new URLSearchParams();
  
  if (page) params.set('page', page.toString());
  if (limit) params.set('limit', limit.toString());
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.sub_id) params.set('sub_id', filters.sub_id.toString());
  if (filters.fam_id) params.set('fam_id', filters.fam_id.toString());
  if (filters.activo !== undefined) params.set('activo', filters.activo.toString());
  if (filters.includeInactive) params.set('includeInactive', filters.includeInactive.toString());
  
  // Cache buster
  params.set('_t', Date.now().toString());
  
  return params.toString();
};

// =============================================
// ZUSTAND STORE (sin cambios en la lógica)
// =============================================
export const useProductsStore = create<ProductsState>((set, get) => ({
  // Estado inicial
  products: [],
  isLoading: false,
  error: null,
  pagination: null,
  filters: {},

  // =============================================
  // LOAD PRODUCTS
  // =============================================
  loadProducts: async (filters = {}, page = 1, limit = CONFIG.PRODUCTS_PAGE_SIZE) => { // ✅ Usar CONFIG
    set({ isLoading: true, error: null });
    
    try {
      const queryParams = buildQueryParams(filters, page, limit);
      const url = queryParams ? `?${queryParams}` : '';
      
      const response = await apiRequest(url, { method: 'GET' });
      const data = await handleApiResponse(response);
      
      set({ 
        products: data.products || [],
        pagination: data.pagination || null,
        filters: { ...filters },
        isLoading: false,
        error: null 
      });
      
      console.log('✅ Productos cargados:', data.products?.length || 0, 'productos');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar productos';
      set({ 
        isLoading: false, 
        error: errorMessage,
        products: [],
        pagination: null
      });
      console.error('❌ Error cargando productos:', errorMessage);
    }
  },

  // =============================================
  // GET SINGLE PRODUCT
  // =============================================
  getProduct: async (cod: string) => {
    if (!cod?.trim()) {
      return { success: false, error: 'Código de producto requerido' };
    }

    try {
      const response = await apiRequest(`/${encodeURIComponent(cod.trim())}`, { method: 'GET' });
      const data = await handleApiResponse(response);
      
      console.log('✅ Producto obtenido:', data.product.descripcion);
      return { success: true, product: data.product };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al obtener producto';
      console.error('❌ Error obteniendo producto:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // =============================================
  // CREATE PRODUCT
  // =============================================
  createProduct: async (productData) => {
    set({ error: null });
    
    try {
      const response = await apiRequest('', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
      
      const data = await handleApiResponse(response);
      console.log('✅ Producto creado:', data.product.descripcion);
      
      // Re-fetch productos para mantener consistencia
      const currentState = get();
      await get().loadProducts(currentState.filters, currentState.pagination?.page || 1);
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear producto';
      set({ error: errorMessage });
      console.error('❌ Error creando producto:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // =============================================
  // UPDATE PRODUCT
  // =============================================
  updateProduct: async (cod: string, productData) => {
    set({ error: null });
    
    try {
      const response = await apiRequest(`/${encodeURIComponent(cod)}`, {
        method: 'PUT',
        body: JSON.stringify(productData),
      });
      
      const data = await handleApiResponse(response);
      console.log('✅ Producto actualizado:', data.product.descripcion);
      
      // Update local
      set(state => ({
        products: state.products.map(product =>
          product.cod === cod ? { ...product, ...data.product } : product
        )
      }));
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar producto';
      set({ error: errorMessage });
      console.error('❌ Error actualizando producto:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // =============================================
  // DELETE PRODUCT
  // =============================================
  deleteProduct: async (cod: string) => {
    set({ error: null });
    
    try {
      const response = await apiRequest(`/${encodeURIComponent(cod)}`, {
        method: 'DELETE',
      });
      
      const data = await handleApiResponse(response);
      console.log('✅ Producto eliminado:', data.deletedProduct.descripcion);
      
      // Update local
      set(state => ({
        products: state.products.filter(product => product.cod !== cod)
      }));
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar producto';
      set({ error: errorMessage });
      console.error('❌ Error eliminando producto:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // =============================================
  // FILTERS (sin cambios)
  // =============================================
  setFilters: (filters: ProductFilters) => {
    set({ filters: { ...filters } });
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  // =============================================
  // ERROR HANDLING (sin cambios)
  // =============================================
  clearError: () => set({ error: null }),
  
  setError: (error: string) => set({ error }),

  // =============================================
  // NAVIGATION (sin cambios)
  // =============================================
  nextPage: async () => {
    const { pagination, filters } = get();
    if (pagination && pagination.hasNext) {
      await get().loadProducts(filters, pagination.page + 1);
    }
  },

  prevPage: async () => {
    const { pagination, filters } = get();
    if (pagination && pagination.hasPrev) {
      await get().loadProducts(filters, pagination.page - 1);
    }
  },

  goToPage: async (page: number) => {
    const { filters } = get();
    await get().loadProducts(filters, page);
  },
}));