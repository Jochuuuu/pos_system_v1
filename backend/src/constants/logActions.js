// backend/constants/logActions.js
// CONSTANTES CENTRALIZADAS PARA SISTEMA DE LOGS
// Evita typos y facilita mantenimiento

/**
 * ACCIONES DEL SISTEMA
 * Formato: ENTIDAD_OPERACION
 * Máximo 30 caracteres (limitado por BD)
 */
const LOG_ACTIONS = {
  // =============================================
  // AUTENTICACIÓN Y SESIONES
  // =============================================
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  
  // =============================================
  // INVENTARIO - FAMILIAS
  // =============================================
  FAMILIA_CREAR: 'FAMILIA_CREAR',
  FAMILIA_EDITAR: 'FAMILIA_EDITAR',
  FAMILIA_ELIMINAR: 'FAMILIA_ELIMINAR',
  FAMILIA_VER: 'FAMILIA_VER',              // Opcional para consultas sensibles
  
  // =============================================
  // INVENTARIO - SUBFAMILIAS
  // =============================================
  SUBFAMILIA_CREAR: 'SUBFAMILIA_CREAR',
  SUBFAMILIA_EDITAR: 'SUBFAMILIA_EDITAR',
  SUBFAMILIA_ELIMINAR: 'SUBFAMILIA_ELIMINAR',
  SUBFAMILIA_MOVER: 'SUBFAMILIA_MOVER',    // Cambiar de familia
  
  // =============================================
  // INVENTARIO - PRODUCTOS
  // =============================================
  PRODUCTO_CREAR: 'PRODUCTO_CREAR',
  PRODUCTO_EDITAR: 'PRODUCTO_EDITAR',
  PRODUCTO_ELIMINAR: 'PRODUCTO_ELIMINAR',
  PRODUCTO_ACTIVAR: 'PRODUCTO_ACTIVAR',
  PRODUCTO_DESACTIVAR: 'PRODUCTO_DESACTIVAR',
  PRODUCTO_STOCK_UPDATE: 'PRODUCTO_STOCK_UPDATE',
  PRODUCTO_PRECIO_UPDATE: 'PRODUCTO_PRECIO_UPDATE',
  
  // =============================================
  // CLIENTES
  // =============================================
  CLIENTE_CREAR: 'CLIENTE_CREAR',
  CLIENTE_EDITAR: 'CLIENTE_EDITAR',
  CLIENTE_ELIMINAR: 'CLIENTE_ELIMINAR',
  CLIENTE_VER_LISTA: 'CLIENTE_VER_LISTA',  // Para reportes o consultas masivas
  CLIENTE_EXPORTAR: 'CLIENTE_EXPORTAR',
  
  // =============================================
  // VENTAS / PUNTO DE VENTA
  // =============================================
  VENTA_CREAR: 'VENTA_CREAR',
  VENTA_ANULAR: 'VENTA_ANULAR',
  VENTA_REEMBOLSO: 'VENTA_REEMBOLSO',
  VENTA_DESCUENTO: 'VENTA_DESCUENTO',
  VENTA_PROMOCION: 'VENTA_PROMOCION',
  
  // =============================================
  // PROMOCIONES
  // =============================================
  PROMOCION_CREAR: 'PROMOCION_CREAR',
  PROMOCION_EDITAR: 'PROMOCION_EDITAR',
  PROMOCION_ELIMINAR: 'PROMOCION_ELIMINAR',
  PROMOCION_ACTIVAR: 'PROMOCION_ACTIVAR',
  PROMOCION_DESACTIVAR: 'PROMOCION_DESACTIVAR',
  
  // =============================================
  // USUARIOS Y ADMINISTRACIÓN
  // =============================================
  USUARIO_CREAR: 'USUARIO_CREAR',
  USUARIO_EDITAR: 'USUARIO_EDITAR',
  USUARIO_ELIMINAR: 'USUARIO_ELIMINAR',
  USUARIO_ACTIVAR: 'USUARIO_ACTIVAR',
  USUARIO_DESACTIVAR: 'USUARIO_DESACTIVAR',
  USUARIO_CAMBIO_ROL: 'USUARIO_CAMBIO_ROL',
  
  // =============================================
  // REPORTES Y CONSULTAS
  // =============================================
  REPORTE_VENTAS: 'REPORTE_VENTAS',
  REPORTE_INVENTARIO: 'REPORTE_INVENTARIO',
  REPORTE_CLIENTES: 'REPORTE_CLIENTES',
  EXPORT_DATOS: 'EXPORT_DATOS',
  BACKUP_CREAR: 'BACKUP_CREAR',
  
  // =============================================
  // SISTEMA Y MANTENIMIENTO
  // =============================================
  SISTEMA_BACKUP: 'SISTEMA_BACKUP',
  SISTEMA_RESTORE: 'SISTEMA_RESTORE',
  LIMPIEZA_LOGS: 'LIMPIEZA_LOGS',
  ARCHIVO_LOGS: 'ARCHIVO_LOGS',
  CONFIG_UPDATE: 'CONFIG_UPDATE',
  
  // =============================================
  // ERRORES Y EXCEPCIONES
  // =============================================
  ERROR_SISTEMA: 'ERROR_SISTEMA',
  ERROR_BD: 'ERROR_BD',
  ERROR_API: 'ERROR_API',
  ACCESO_DENEGADO: 'ACCESO_DENEGADO'
};

/**
 * CATEGORÍAS DEL SISTEMA
 * Agrupan acciones relacionadas
 * Máximo 30 caracteres (limitado por BD)
 */
const LOG_CATEGORIES = {
  // Módulos principales
  AUTENTICACION: 'AUTENTICACION',
  INVENTARIO: 'INVENTARIO',
  CLIENTES: 'CLIENTES',
  VENTAS: 'VENTAS',
  PROMOCIONES: 'PROMOCIONES',
  USUARIOS: 'USUARIOS',
  REPORTES: 'REPORTES',
  
  // Sistema
  SISTEMA: 'SISTEMA',
  SEGURIDAD: 'SEGURIDAD',
  ADMIN: 'ADMIN',
  ERROR: 'ERROR'
};

/**
 * MAPEO DE ACCIONES A CATEGORÍAS
 * Para asignar automáticamente la categoría según la acción
 */
const ACTION_TO_CATEGORY = {
  // Autenticación
  [LOG_ACTIONS.LOGIN]: LOG_CATEGORIES.AUTENTICACION,
  [LOG_ACTIONS.LOGOUT]: LOG_CATEGORIES.AUTENTICACION,
  [LOG_ACTIONS.REFRESH_TOKEN]: LOG_CATEGORIES.AUTENTICACION,
  [LOG_ACTIONS.LOGIN_FAILED]: LOG_CATEGORIES.SEGURIDAD,
  [LOG_ACTIONS.PASSWORD_CHANGE]: LOG_CATEGORIES.SEGURIDAD,
  
  // Inventario
  [LOG_ACTIONS.FAMILIA_CREAR]: LOG_CATEGORIES.INVENTARIO,
  [LOG_ACTIONS.FAMILIA_EDITAR]: LOG_CATEGORIES.INVENTARIO,
  [LOG_ACTIONS.FAMILIA_ELIMINAR]: LOG_CATEGORIES.INVENTARIO,
  [LOG_ACTIONS.SUBFAMILIA_CREAR]: LOG_CATEGORIES.INVENTARIO,
  [LOG_ACTIONS.SUBFAMILIA_EDITAR]: LOG_CATEGORIES.INVENTARIO,
  [LOG_ACTIONS.SUBFAMILIA_ELIMINAR]: LOG_CATEGORIES.INVENTARIO,
  [LOG_ACTIONS.PRODUCTO_CREAR]: LOG_CATEGORIES.INVENTARIO,
  [LOG_ACTIONS.PRODUCTO_EDITAR]: LOG_CATEGORIES.INVENTARIO,
  [LOG_ACTIONS.PRODUCTO_ELIMINAR]: LOG_CATEGORIES.INVENTARIO,
  
  // Clientes
  [LOG_ACTIONS.CLIENTE_CREAR]: LOG_CATEGORIES.CLIENTES,
  [LOG_ACTIONS.CLIENTE_EDITAR]: LOG_CATEGORIES.CLIENTES,
  [LOG_ACTIONS.CLIENTE_ELIMINAR]: LOG_CATEGORIES.CLIENTES,
  
  // Ventas
  [LOG_ACTIONS.VENTA_CREAR]: LOG_CATEGORIES.VENTAS,
  [LOG_ACTIONS.VENTA_ANULAR]: LOG_CATEGORIES.VENTAS,
  [LOG_ACTIONS.VENTA_REEMBOLSO]: LOG_CATEGORIES.VENTAS,
  
  // Sistema
  [LOG_ACTIONS.LIMPIEZA_LOGS]: LOG_CATEGORIES.SISTEMA,
  [LOG_ACTIONS.ARCHIVO_LOGS]: LOG_CATEGORIES.SISTEMA,
  
  // Errores
  [LOG_ACTIONS.ERROR_SISTEMA]: LOG_CATEGORIES.ERROR,
  [LOG_ACTIONS.ERROR_BD]: LOG_CATEGORIES.ERROR,
  [LOG_ACTIONS.ACCESO_DENEGADO]: LOG_CATEGORIES.SEGURIDAD
};

/**
 * Helper para obtener la categoría automáticamente
 * @param {string} action - Acción del LOG_ACTIONS
 * @returns {string} - Categoría correspondiente
 */
const getCategoryForAction = (action) => {
  return ACTION_TO_CATEGORY[action] || LOG_CATEGORIES.SISTEMA;
};

/**
 * Validar que una acción existe en las constantes
 * @param {string} action - Acción a validar
 * @returns {boolean} - true si la acción es válida
 */
const isValidAction = (action) => {
  return Object.values(LOG_ACTIONS).includes(action);
};

/**
 * Validar que una categoría existe en las constantes
 * @param {string} category - Categoría a validar
 * @returns {boolean} - true si la categoría es válida
 */
const isValidCategory = (category) => {
  return Object.values(LOG_CATEGORIES).includes(category);
};

/**
 * Obtener todas las acciones de una categoría específica
 * @param {string} category - Categoría objetivo
 * @returns {string[]} - Array de acciones de esa categoría
 */
const getActionsByCategory = (category) => {
  return Object.entries(ACTION_TO_CATEGORY)
    .filter(([action, cat]) => cat === category)
    .map(([action]) => action);
};

module.exports = {
  LOG_ACTIONS,
  LOG_CATEGORIES,
  ACTION_TO_CATEGORY,
  getCategoryForAction,
  isValidAction,
  isValidCategory,
  getActionsByCategory
};