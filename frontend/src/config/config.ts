// frontend/src/config/config.ts
// 🔧 CONFIGURACIÓN CENTRALIZADA SIMPLE

// =============================================
// 🌐 URLs Y ENDPOINTS
// =============================================
export const API_URL = 'http://localhost:3000/api';
export const BASE_URL = 'http://localhost:3000';

// =============================================
// 🎯 CONFIGURACIÓN BÁSICA
// =============================================
export const CONFIG = {
  // Paginación
  PAGE_SIZE: 25,
  PRODUCTS_PAGE_SIZE: 50,
  CUSTOMERS_PAGE_SIZE: 10,
  
  // Timeouts
  SEARCH_DEBOUNCE: 500,
  DB_DELAY: 1000,
  
  // Storage
  TOKEN_KEY: 'accessToken',
  
  // Headers anti-cache
  HEADERS: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};

// =============================================
// 🛠️ HELPER SIMPLE PARA REQUESTS
// =============================================
export const getAuthHeaders = () => {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  return {
    ...CONFIG.HEADERS,
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const getRequestConfig = (options: RequestInit = {}) => {
  return {
    credentials: 'include' as RequestCredentials,
    cache: 'no-store' as RequestCache,
    headers: getAuthHeaders(),
    ...options
  };
};