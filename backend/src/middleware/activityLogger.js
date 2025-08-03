// backend/middleware/activityLogger.js
// MIDDLEWARE CENTRALIZADO DE LOGGING - REUTILIZABLE PARA TODO EL SISTEMA
const { pool } = require('../config/database');

/**
 * Registra una actividad en el sistema de logs
 * @param {Object} req - Request object (para obtener usuario e IP)
 * @param {string} action - Acción realizada (usar constantes de logActions.js)
 * @param {string} categoria - Categoría de la acción (INVENTARIO, CLIENTES, VENTAS, etc.)
 * @param {string} descripcion - Descripción detallada de la acción
 * @param {number|null} monto - Monto involucrado (opcional, para ventas)
 * @returns {Promise<boolean>} - true si se registró correctamente, false si falló
 */
const logActivity = async (req, action, categoria, descripcion, monto = null) => {
  try {
    // 🔐 Extraer datos del usuario desde el token JWT
    const usuarioId = req.userData?.id || null;
    const usuarioNombre = req.userData?.name || 'Sistema';
    
    // 🌐 Capturar IP del cliente
    const ipOrigen = req.ip || 
                     req.connection?.remoteAddress || 
                     req.socket?.remoteAddress || 
                     req.headers['x-forwarded-for']?.split(',')[0] ||
                     null;

    // 🛡️ Validar y truncar parámetros por seguridad
    const actionSafe = action ? action.toString().substring(0, 30) : 'ACCION_DESCONOCIDA';
    const categoriaSafe = categoria ? categoria.toString().substring(0, 30) : null;
    const descripcionSafe = descripcion ? descripcion.toString().substring(0, 200) : null;
    const montoSafe = monto && !isNaN(monto) ? parseFloat(monto) : null;

    // 📝 Usar la función PostgreSQL registrar_log() que ya tienes
    const query = 'SELECT registrar_log($1, $2, $3, $4, $5, $6) as log_id';
    const values = [
      usuarioId,
      actionSafe,
      categoriaSafe, 
      descripcionSafe,
      montoSafe,
      ipOrigen
    ];

    const result = await pool.query(query, values);
    const logId = result.rows[0]?.log_id;

    // 📊 Log para desarrollo (opcional - quitar en producción)
    const timestamp = new Date().toISOString();
    console.log(`📝 [${timestamp}] [${usuarioNombre}] ${actionSafe}: ${descripcionSafe} (Log ID: ${logId})`);
    
    return true;

  } catch (error) {
    // 🚨 CRÍTICO: NO fallar la operación principal si falla el logging
    // Solo logear el error y continuar
    console.error('❌ Error registrando actividad:', {
      error: error.message,
      action,
      categoria,
      descripcion: descripcion?.substring(0, 50) + '...',
      usuario: req.userData?.name || 'Desconocido',
      timestamp: new Date().toISOString()
    });
    
    return false;
  }
};

/**
 * Helper para formatear descripciones comunes
 */
const formatDescriptions = {
  /**
   * Formato para creación de entidades
   * @param {string} entityType - Tipo de entidad (Familia, Cliente, etc.)
   * @param {string} entityName - Nombre de la entidad
   * @param {number|string} entityId - ID de la entidad
   */
  created: (entityType, entityName, entityId) => 
    `${entityType} creada: "${entityName}" (ID: ${entityId})`,

  /**
   * Formato para edición de entidades
   * @param {string} entityType - Tipo de entidad
   * @param {string} oldName - Nombre anterior (opcional)
   * @param {string} newName - Nombre nuevo
   * @param {number|string} entityId - ID de la entidad
   */
  updated: (entityType, oldName, newName, entityId) => {
    if (oldName && oldName !== newName) {
      return `${entityType} editada: "${oldName}" → "${newName}" (ID: ${entityId})`;
    }
    return `${entityType} editada: "${newName}" (ID: ${entityId})`;
  },

  /**
   * Formato para eliminación de entidades
   * @param {string} entityType - Tipo de entidad
   * @param {string} entityName - Nombre de la entidad
   * @param {number|string} entityId - ID de la entidad
   */
  deleted: (entityType, entityName, entityId) => 
    `${entityType} eliminada: "${entityName}" (ID: ${entityId})`,

  /**
   * Formato para operaciones de venta
   * @param {string} clientName - Nombre del cliente
   * @param {number} total - Total de la venta
   * @param {number} facturaNum - Número de factura
   */
  sale: (clientName, total, facturaNum) => 
    `Venta registrada - Cliente: ${clientName} - Factura: ${facturaNum}`,

  /**
   * Formato para login/logout
   * @param {string} userName - Nombre del usuario
   * @param {string} action - login/logout
   */
  auth: (userName, action) => 
    `Usuario ${action}: ${userName}`
};

/**
 * Wrapper específicos para operaciones comunes (opcional - para mayor comodidad)
 */
const logHelpers = {
  // Para familias/categorías
  familyCreated: (req, familyName, familyId) => 
    logActivity(req, 'FAMILIA_CREAR', 'INVENTARIO', 
      formatDescriptions.created('Familia', familyName, familyId)),

  familyUpdated: (req, oldName, newName, familyId) => 
    logActivity(req, 'FAMILIA_EDITAR', 'INVENTARIO', 
      formatDescriptions.updated('Familia', oldName, newName, familyId)),

  familyDeleted: (req, familyName, familyId) => 
    logActivity(req, 'FAMILIA_ELIMINAR', 'INVENTARIO', 
      formatDescriptions.deleted('Familia', familyName, familyId)),

  // Para subfamilias
  subfamilyCreated: (req, subfamilyName, subfamilyId, familyName) => 
    logActivity(req, 'SUBFAMILIA_CREAR', 'INVENTARIO', 
      `Subfamilia creada: "${subfamilyName}" en familia "${familyName}" (ID: ${subfamilyId})`),

  subfamilyUpdated: (req, oldName, newName, subfamilyId) => 
    logActivity(req, 'SUBFAMILIA_EDITAR', 'INVENTARIO', 
      formatDescriptions.updated('Subfamilia', oldName, newName, subfamilyId)),

  subfamilyDeleted: (req, subfamilyName, subfamilyId) => 
    logActivity(req, 'SUBFAMILIA_ELIMINAR', 'INVENTARIO', 
      formatDescriptions.deleted('Subfamilia', subfamilyName, subfamilyId)),

  // Para productos
  productCreated: (req, productName, productId) => 
    logActivity(req, 'PRODUCTO_CREAR', 'INVENTARIO', 
      formatDescriptions.created('Producto', productName, productId)),

  productUpdated: (req, productName, productId) => 
    logActivity(req, 'PRODUCTO_EDITAR', 'INVENTARIO', 
      formatDescriptions.updated('Producto', '', productName, productId)),

  productDeleted: (req, productName, productId) => 
    logActivity(req, 'PRODUCTO_ELIMINAR', 'INVENTARIO', 
      formatDescriptions.deleted('Producto', productName, productId)),

  // Para clientes
  customerCreated: (req, customerName, customerId) => 
    logActivity(req, 'CLIENTE_CREAR', 'CLIENTES', 
      formatDescriptions.created('Cliente', customerName, customerId)),

  customerUpdated: (req, customerName, customerId) => 
    logActivity(req, 'CLIENTE_EDITAR', 'CLIENTES', 
      formatDescriptions.updated('Cliente', '', customerName, customerId)),

  customerDeleted: (req, customerName, customerId) => 
    logActivity(req, 'CLIENTE_ELIMINAR', 'CLIENTES', 
      formatDescriptions.deleted('Cliente', customerName, customerId)),

  // Para ventas
  saleCreated: (req, clientName, total, facturaNum) => 
    logActivity(req, 'VENTA_CREAR', 'VENTAS', 
      formatDescriptions.sale(clientName, total, facturaNum), total),

  // Para autenticación
  userLogin: (req, userName) => 
    logActivity(req, 'LOGIN', 'AUTENTICACION', 
      formatDescriptions.auth(userName, 'ingresó')),

  userLogout: (req, userName) => 
    logActivity(req, 'LOGOUT', 'AUTENTICACION', 
      formatDescriptions.auth(userName, 'salió'))
};

module.exports = {
  logActivity,
  formatDescriptions,
  logHelpers
};