// frontend/src/stores/inventory/categoriesStore.ts
// ACTUALIZADO CON CONFIGURACIÓN SIMPLE

import { create } from 'zustand';
import { API_URL, CONFIG, getRequestConfig } from '../../config/config';

// Interfaces (sin cambios)
export interface Subfamilia {
  id: number;
  nom: string;
  productCount?: number;
}

export interface Familia {
  id: number;
  nom: string;
  subfamilias: Subfamilia[];
  productCount?: number;
  expanded?: boolean;
}

interface CategoriesState {
  familias: Familia[];
  isLoading: boolean;
  error: string | null;
  
  loadCategories: (includeProductCount?: boolean) => Promise<void>;
  createFamily: (nom: string) => Promise<{ success: boolean; error?: string }>;
  updateFamily: (id: number, nom: string) => Promise<{ success: boolean; error?: string }>;
  deleteFamily: (id: number) => Promise<{ success: boolean; error?: string }>;
  createSubfamily: (fam_id: number, nom: string) => Promise<{ success: boolean; error?: string }>;
  updateSubfamily: (id: number, nom: string) => Promise<{ success: boolean; error?: string }>;
  deleteSubfamily: (id: number) => Promise<{ success: boolean; error?: string }>;
  
  toggleFamilyExpansion: (familyId: number) => void;
  clearError: () => void;
  setError: (error: string) => void;
}

// ✅ URL base centralizada
const CATEGORIES_API = `${API_URL}/inventory/categories`;

// ✅ Request helper simplificado
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  console.log(`🌐 Categories API: ${options.method || 'GET'} ${endpoint}`);
  
  const response = await fetch(`${CATEGORIES_API}${endpoint}`, getRequestConfig(options));

  // Auto refresh si 401
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
        
        // Retry request
        return await fetch(`${CATEGORIES_API}${endpoint}`, getRequestConfig(options));
      } else {
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        window.location.href = '/login';
      }
    } catch (error) {
      localStorage.removeItem(CONFIG.TOKEN_KEY);
      window.location.href = '/login';
    }
  }

  return response;
};

const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }
  return data;
};

// ✅ Store simplificado
export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  familias: [],
  isLoading: false,
  error: null,

  loadCategories: async (includeProductCount = false) => {
    set({ isLoading: true, error: null });
    
    try {
      const timestamp = Date.now();
      const params = includeProductCount 
        ? `?includeProductCount=true&_t=${timestamp}` 
        : `?_t=${timestamp}`;
      
      const response = await apiRequest(params);
      const data = await handleResponse(response);
      
      const familiasWithExpanded = data.categories.map((familia: Familia) => ({
        ...familia,
        expanded: false,
        productCount: familia.productCount || 0,
        subfamilias: familia.subfamilias.map(sub => ({
          ...sub,
          productCount: sub.productCount || 0
        }))
      }));
      
      set({ 
        familias: familiasWithExpanded, 
        isLoading: false,
        error: null 
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar categorías';
      set({ 
        isLoading: false, 
        error: errorMessage,
        familias: []
      });
    }
  },

  createFamily: async (nom: string) => {
    set({ error: null });
    
    try {
      const response = await apiRequest('/familia', {
        method: 'POST',
        body: JSON.stringify({ nom })
      });
      
      await handleResponse(response);
      await get().loadCategories();
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear familia';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  updateFamily: async (id: number, nom: string) => {
    set({ error: null });
    
    try {
      const response = await apiRequest(`/familia/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ nom })
      });
      
      const data = await handleResponse(response);
      
      set(state => ({
        familias: state.familias.map(familia =>
          familia.id === id ? { ...familia, nom: data.familia.nom } : familia
        )
      }));
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar familia';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  deleteFamily: async (id: number) => {
    set({ error: null });
    
    try {
      const response = await apiRequest(`/familia/${id}`, {
        method: 'DELETE'
      });
      
      await handleResponse(response);
      
      set(state => ({
        familias: state.familias.filter(familia => familia.id !== id)
      }));
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar familia';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  createSubfamily: async (fam_id: number, nom: string) => {
    set({ error: null });
    
    try {
      const response = await apiRequest('/subfamilia', {
        method: 'POST',
        body: JSON.stringify({ fam_id, nom })
      });
      
      const data = await handleResponse(response);
      
      set(state => ({
        familias: state.familias.map(familia =>
          familia.id === fam_id
            ? {
                ...familia,
                subfamilias: [...familia.subfamilias, { 
                  ...data.subfamilia, 
                  productCount: 0 
                }],
                expanded: true
              }
            : familia
        )
      }));
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear subfamilia';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  updateSubfamily: async (id: number, nom: string, fam_id?: number) => {
    set({ error: null });
    
    try {
      const body: any = { nom };
      if (fam_id) body.fam_id = fam_id;

      const response = await apiRequest(`/subfamilia/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      
      const data = await handleResponse(response);
      
      if (data.familyChanged) {
        await get().loadCategories();
      } else {
        set(state => ({
          familias: state.familias.map(familia => ({
            ...familia,
            subfamilias: familia.subfamilias.map(sub =>
              sub.id === id ? { ...sub, nom: data.subfamilia.nom } : sub
            )
          }))
        }));
      }
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar subfamilia';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  deleteSubfamily: async (id: number) => {
    set({ error: null });
    
    try {
      const response = await apiRequest(`/subfamilia/${id}`, {
        method: 'DELETE'
      });
      
      await handleResponse(response);
      
      set(state => ({
        familias: state.familias.map(familia => ({
          ...familia,
          subfamilias: familia.subfamilias.filter(sub => sub.id !== id)
        }))
      }));
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar subfamilia';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  toggleFamilyExpansion: (familyId: number) => {
    set(state => ({
      familias: state.familias.map(familia =>
        familia.id === familyId
          ? { ...familia, expanded: !familia.expanded }
          : { ...familia, expanded: false }
      )
    }));
  },

  clearError: () => set({ error: null }),
  setError: (error: string) => set({ error }),
}));