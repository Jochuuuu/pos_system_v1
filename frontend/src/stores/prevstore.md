// frontend/src/stores/authStore.ts
import { create } from 'zustand';

// =============================================
// 📋 INTERFACES Y TIPOS
// =============================================

// Estructura de datos del usuario
interface User {
  id: number;
  email: string;
  name: string;
  role: 'A' | 'C' | 'S'; // Roles de la BD: A=Admin, C=Cajero, S=Supervisor
}

// Estado completo del store de autenticación
interface AuthState {
  // 📊 ESTADO
  user: User | null;              // Datos del usuario logueado (null si no está logueado)
  isAuthenticated: boolean;       // true si usuario está logueado
  isLoading: boolean;             // true durante procesos de login/logout
  isInitialized: boolean;         // true cuando se verificó la sesión al cargar la app
  error: string | null;           // Mensaje de error si algo falla

  // 🔧 ACCIONES
  login: (email: string, password: string) => Promise<void>;  // Función para iniciar sesión
  logout: () => void;                                         // Función para cerrar sesión
  clearError: () => void;                                     // Limpiar mensajes de error
  initializeAuth: () => Promise<void>;                        // Verificar sesión al cargar app
  refreshToken: () => Promise<boolean>;                       // Renovar token expirado
  
  // 🎭 FUNCIONES DE ROLES (getters)
  getUserRole: () => 'A' | 'C' | 'S' | null;                // Obtener rol del usuario actual
  getUserRoleName: () => string;                             // Obtener nombre del rol actual
  isAdmin: () => boolean;                                    // Verificar si es administrador
  canAccessAdmin: () => boolean;                             // Puede acceder a admin
  canMakeSales: () => boolean;                               // Puede hacer ventas
  canViewReports: () => boolean;                             // Puede ver reportes
  hasPermission: (requiredRole: 'A' | 'C' | 'S') => boolean; // Verificar permiso específico
}

// URL base del backend
const API_URL = 'http://localhost:3000/api';

// =============================================
// 🎭 UTILIDADES PARA ROLES
// =============================================

// Mapear roles de BD a nombres legibles
export const getRoleName = (role: 'A' | 'C' | 'S'): string => {
  const roleNames = {
    'A': 'Administrador',
    'C': 'Cajero', 
    'S': 'Supervisor'
  };
  return roleNames[role] || 'Desconocido';
};

// Verificar permisos por rol
export const hasPermission = (userRole: 'A' | 'C' | 'S', requiredRole: 'A' | 'C' | 'S'): boolean => {
  const roleHierarchy = {
    'A': 3, // Admin tiene máximo nivel
    'S': 2, // Supervisor nivel medio
    'C': 1  // Cajero nivel básico
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

// Verificar si es administrador
export const isAdmin = (role: 'A' | 'C' | 'S'): boolean => role === 'A';

// Verificar si puede acceder a módulos de administración
export const canAccessAdmin = (role: 'A' | 'C' | 'S'): boolean => ['A', 'S'].includes(role);

// Verificar si puede hacer ventas
export const canMakeSales = (role: 'A' | 'C' | 'S'): boolean => ['A', 'C', 'S'].includes(role);

// Verificar si puede ver reportes
export const canViewReports = (role: 'A' | 'C' | 'S'): boolean => ['A', 'S'].includes(role);

// =============================================
// 🏪 CREACIÓN DEL STORE CON ZUSTAND
// =============================================

export const useAuthStore = create<AuthState>((set, get) => ({
  
  // =============================================
  // 📊 ESTADO INICIAL
  // =============================================
  
  user: null,                     // Sin usuario al inicio
  isAuthenticated: false,         // No autenticado al inicio
  isLoading: false,              // No cargando al inicio
  isInitialized: false,          // Aún no se verificó la sesión
  error: null,                   // Sin errores al inicio

  // =============================================
  // 🔄 INICIALIZACIÓN DE AUTENTICACIÓN
  // =============================================
  
  // Esta función se ejecuta al cargar la aplicación
  // Su propósito: Verificar si hay una sesión válida guardada
  initializeAuth: async () => {
    console.log('🔄 Inicializando autenticación...');
    
    // 🔍 PASO 1: Buscar token guardado en localStorage
    const token = localStorage.getItem('accessToken');
    console.log('🔑 Token encontrado:', token ? 'Sí' : 'No');
    
    // Si no hay token, marcar como no autenticado y terminar
    if (!token) {
      console.log('❌ No hay token, marcando como no autenticado');
      set({ 
        isInitialized: true,      // Ya terminamos la verificación
        isAuthenticated: false,   // No está autenticado
        user: null               // Sin datos de usuario
      });
      return;
    }

    try {
      console.log('🌐 Verificando token con el servidor...');
      
      // 🔍 PASO 2: Verificar si el token es válido con el servidor
      const response = await fetch(`${API_URL}/protected`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,    // Enviar token en header
          'Content-Type': 'application/json',
        },
        credentials: 'include',                  // Incluir cookies (para refresh token)
      });

      console.log('📡 Respuesta del servidor:', response.status);

      // ✅ Si el token es válido (status 200)
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Token válido, datos del usuario:', data);
        
        // Actualizar estado con datos del usuario
        if (data.user) {
          set({
            user: data.user,           // Guardar datos del usuario
            isAuthenticated: true,     // Marcar como autenticado
            isInitialized: true,       // Verificación completada
          });
          console.log('✅ Usuario autenticado correctamente');
          return; // Salir aquí si todo está bien
        }
      } else {
        // ⚠️ Token inválido o expirado
        console.log('⚠️ Token inválido, intentando refresh...');
        
        // 🔄 PASO 3: Intentar renovar token automáticamente
        const refreshSuccess = await get().refreshToken();
        if (refreshSuccess) {
          console.log('✅ Refresh exitoso');
          return; // Salir aquí si el refresh funcionó
        }
        // Si el refresh falla, continúa al cleanup
      }
    } catch (error) {
      // 💥 Error de red o servidor
      console.error('❌ Error al verificar token:', error);
    }

    // 🧹 CLEANUP: Si llegamos aquí, algo falló
    console.log('❌ Verificación falló, limpiando sesión');
    localStorage.removeItem('accessToken');  // Borrar token inválido
    set({
      user: null,                           // Limpiar usuario
      isAuthenticated: false,               // No autenticado
      isInitialized: true,                  // Pero sí inicializado
    });
  },

  // =============================================
  // 🔄 RENOVACIÓN DE TOKEN
  // =============================================
  
  // Esta función renueva un token expirado usando el refresh token
  // Se ejecuta automáticamente cuando el access token expira
  refreshToken: async () => {
    try {
      console.log('🔄 Intentando renovar token...');
      
      // 🍪 PASO 1: Solicitar nuevo token usando refresh token (en cookie)
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',              // CRÍTICO: Enviar cookies con refresh token
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // ✅ Si el servidor devuelve nuevo token
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Nuevo token recibido');
        
        // 💾 PASO 2: Guardar nuevo token en localStorage
        localStorage.setItem('accessToken', data.accessToken);
        
        // 🔍 PASO 3: Verificar que el nuevo token funciona
        const verifyResponse = await fetch(`${API_URL}/protected`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${data.accessToken}`,  // Usar nuevo token
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        // ✅ Si el nuevo token es válido
        if (verifyResponse.ok) {
          const userData = await verifyResponse.json();
          console.log('✅ Usuario verificado con nuevo token:', userData);
          
          // Actualizar estado con nuevo token válido
          set({
            user: userData.user,        // Datos del usuario
            isAuthenticated: true,      // Autenticado
            isInitialized: true,        // Inicializado
          });
          return true; // ✅ Renovación exitosa
        }
      }
      
      // ❌ Si algo falló en el proceso
      console.log('❌ Refresh falló');
      return false;
    } catch (error) {
      // 💥 Error durante renovación
      console.error('❌ Error al renovar token:', error);
      return false;
    }
  },

  // =============================================
  // 🔐 PROCESO DE LOGIN
  // =============================================
  
  // Función para iniciar sesión con email y contraseña
  login: async (email: string, password: string) => {
    // 🔄 Activar estado de carga
    set({ isLoading: true, error: null });
    
    try {
      console.log('🔐 Intentando login para:', email);
      
      // 🌐 PASO 1: Enviar credenciales al servidor
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',                    // Para recibir cookies de refresh token
        body: JSON.stringify({ email, password }), // Credenciales en el body
      });

      const data = await response.json();

      // ❌ Si las credenciales son incorrectas
      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      console.log('✅ Login exitoso:', data);
      
      // 💾 PASO 2: Guardar access token en localStorage
      localStorage.setItem('accessToken', data.accessToken);
      // Nota: El refresh token se guarda automáticamente en cookie httpOnly

      // ✅ PASO 3: Actualizar estado de la aplicación
      set({
        user: data.user,              // Datos del usuario logueado
        isAuthenticated: true,        // Usuario autenticado
        isLoading: false,            // Ya no está cargando
        isInitialized: true,         // Aplicación inicializada
        error: null,                 // Sin errores
      });

    } catch (error) {
      // 💥 Error durante login
      console.error('❌ Error en login:', error);
      set({
        error: error instanceof Error ? error.message : 'Error desconocido',
        isLoading: false,            // Ya no está cargando
        isAuthenticated: false,      // Login falló
        user: null,                  // Sin usuario
      });
      throw error; // Re-lanzar error para que Login.tsx lo maneje
    }
  },

  // =============================================
  // 🚪 PROCESO DE LOGOUT
  // =============================================
  
  // Función para cerrar sesión y limpiar tokens
  logout: async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      
      // 🌐 PASO 1: Notificar al servidor para invalidar refresh token
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',  // Enviar cookies para que servidor pueda limpiarlas
      });
    } catch (error) {
      // 💥 Error al notificar logout (no crítico)
      console.error('Error al hacer logout:', error);
    } finally {
      // 🧹 PASO 2: Limpiar estado local SIEMPRE (aunque falle el servidor)
      localStorage.removeItem('accessToken');  // Borrar access token
      set({
        user: null,                           // Limpiar usuario
        isAuthenticated: false,               // No autenticado
        error: null,                          // Limpiar errores
      });
      console.log('✅ Sesión cerrada');
    }
  },

  // =============================================
  // 🧹 LIMPIAR ERRORES
  // =============================================
  
  // Función simple para limpiar mensajes de error
  clearError: () => set({ error: null }),

  // =============================================
  // 🎭 FUNCIONES DE ROLES
  // =============================================
  
  // Obtener rol del usuario actual
  getUserRole: () => {
    const state = get();
    return state.user?.role || null;
  },

  // Obtener nombre legible del rol actual
  getUserRoleName: () => {
    const state = get();
    if (!state.user?.role) return 'Sin rol';
    return getRoleName(state.user.role);
  },

  // Verificar si el usuario actual es administrador
  isAdmin: () => {
    const state = get();
    return state.user?.role === 'A';
  },

  // Verificar si puede acceder a funciones de administración
  canAccessAdmin: () => {
    const state = get();
    if (!state.user?.role) return false;
    return canAccessAdmin(state.user.role);
  },

  // Verificar si puede hacer ventas
  canMakeSales: () => {
    const state = get();
    if (!state.user?.role) return false;
    return canMakeSales(state.user.role);
  },

  // Verificar si puede ver reportes
  canViewReports: () => {
    const state = get();
    if (!state.user?.role) return false;
    return canViewReports(state.user.role);
  },

  // Verificar si tiene un permiso específico
  hasPermission: (requiredRole: 'A' | 'C' | 'S') => {
    const state = get();
    if (!state.user?.role) return false;
    return hasPermission(state.user.role, requiredRole);
  },

}));

// =============================================
// 📋 RESUMEN DE FLUJOS PRINCIPALES
// =============================================

/*
🔄 FLUJO DE INICIALIZACIÓN (al cargar app):
1. App.tsx ejecuta initializeAuth()
2. Busca token en localStorage
3. Si hay token → Verifica con servidor
4. Si es válido → Restaura sesión
5. Si es inválido → Intenta refresh
6. Si refresh falla → Limpia todo

🔐 FLUJO DE LOGIN:
1. Usuario ingresa credenciales
2. Envía POST /auth/login
3. Servidor valida y devuelve tokens + datos usuario (incluyendo rol)
4. Guarda access token en localStorage
5. Refresh token se guarda en cookie automáticamente
6. Actualiza estado a "autenticado" con rol

🔄 FLUJO DE RENOVACIÓN:
1. Token expira (después de 15 min)
2. Próxima operación detecta 401
3. refreshToken() ejecuta POST /auth/refresh
4. Servidor lee refresh token de cookie
5. Devuelve nuevo access token
6. Guarda nuevo token y continúa

🚪 FLUJO DE LOGOUT:
1. Usuario hace click en "Cerrar sesión"
2. Envía POST /auth/logout
3. Servidor limpia refresh token cookie
4. Cliente limpia localStorage
5. Estado vuelve a "no autenticado"

🎭 SISTEMA DE ROLES:
- A = Administrador (acceso total)
- S = Supervisor (reportes + ventas)
- C = Cajero (solo ventas)

Funciones disponibles:
- getUserRole() → 'A' | 'C' | 'S'
- getUserRoleName() → 'Administrador' | 'Cajero' | 'Supervisor'
- isAdmin() → true si es administrador
- canAccessAdmin() → true si puede acceder admin (A o S)
- canMakeSales() → true si puede hacer ventas (todos)
- canViewReports() → true si puede ver reportes (A o S)
- hasPermission(role) → true si tiene permiso específico
*/