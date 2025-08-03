// backend/routes/customers.js - SEGURO Y OPTIMIZADO
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');

// =============================================
// 🔍 OBTENER TODOS LOS CLIENTES - SEGURO Y OPTIMIZADO
// =============================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25, // ← Límite más razonable
      search = '',
      tipo = 'all',
      sortBy = 'nom',
      sortOrder = 'asc'
    } = req.query;

    // 🛡️ VALIDACIONES DE SEGURIDAD
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(5, parseInt(limit) || 25)); // ← Límite máximo
    const offset = (pageNum - 1) * limitNum;
    
    // Validar campo de ordenamiento (whitelist)
    const allowedSortFields = ['nom', 'doc', 'id', 'tipo'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'nom';
    const validSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // Validar tipo (whitelist)
    const allowedTypes = ['all', 'P', 'E'];
    const validTipo = allowedTypes.includes(tipo) ? tipo : 'all';

    // 🔍 CONSTRUCCIÓN SEGURA DE QUERY CON PARÁMETROS
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtro de búsqueda seguro - SOLO DNI O NOMBRE
   if (search && search.trim().length >= 2) {
  const searchSafe = search.trim().substring(0, 50).replace(/'/g, "''"); // Escape de comillas
  whereConditions.push(`(
    nom ILIKE '%${searchSafe}%' OR 
    (doc IS NOT NULL AND doc ILIKE '%${searchSafe}%')
  )`);
  // Sin parámetros - concatenación directa pero segura
}
    // Filtro de tipo seguro
    if (validTipo !== 'all') {
      whereConditions.push(`tipo = $${paramIndex}`);
      queryParams.push(validTipo);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    // 📊 QUERY OPTIMIZADA PARA CONTAR (solo si es necesario)
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM cliente 
      ${whereClause}
    `;

    // 📋 QUERY PRINCIPAL OPTIMIZADA
    const dataQuery = `
      SELECT 
        id, doc, nom, dir, telefono, email, tipo
      FROM cliente 
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Agregar parámetros de paginación
    queryParams.push(limitNum, offset);

    // 🚀 EJECUTAR QUERIES EN PARALELO (más rápido)
    const startTime = Date.now();
    
    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, queryParams.slice(0, -2)), // Sin LIMIT/OFFSET para count
      pool.query(dataQuery, queryParams)
    ]);

    const executionTime = Date.now() - startTime;
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    // 📤 RESPUESTA OPTIMIZADA
    const response = {
      customers: dataResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      filters: {
        search: search.trim(),
        tipo: validTipo,
        sortBy: validSortBy,
        sortOrder: validSortOrder.toLowerCase()
      },
      meta: {
        executionTime: `${executionTime}ms`,
        resultCount: dataResult.rows.length
      }
    };

    // 📊 LOGS DE PERFORMANCE
    console.log(`✅ Query ejecutada en ${executionTime}ms - ${dataResult.rows.length}/${total} registros`);
    
    // 🎯 HEADERS DE CACHE (para optimización frontend)
    res.set({
      'Cache-Control': 'private, max-age=60', // Cache 1 minuto
      'X-Total-Count': total.toString(),
      'X-Execution-Time': `${executionTime}ms`
    });

    res.json(response);

  } catch (error) {
    console.error('❌ Error optimizado:', error.message);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// ➕ CREAR CLIENTE - SEGURO Y OPTIMIZADO
// =============================================
router.post('/', authMiddleware, async (req, res) => {
  try {
    // 🛡️ VALIDACIÓN Y SANITIZACIÓN
    const { doc, nom, dir, telefono, email, tipo } = req.body;

    // Validaciones estrictas
    if (!nom || typeof nom !== 'string' || nom.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Nombre requerido (mínimo 2 caracteres)',
        field: 'nom'
      });
    }

    if (nom.trim().length > 65) {
      return res.status(400).json({ 
        error: 'Nombre muy largo (máximo 65 caracteres)',
        field: 'nom'
      });
    }

    // Validar tipo
    const validTipo = ['P', 'E'].includes(tipo) ? tipo : 'P';

    // Sanitizar inputs
    const cleanData = {
      doc: doc?.toString().trim().substring(0, 15) || null,
      nom: nom.toString().trim().substring(0, 65),
      dir: dir?.toString().trim().substring(0, 85) || null,
      telefono: telefono?.toString().trim().substring(0, 15) || null,
      email: email?.toString().trim().substring(0, 100) || null,
      tipo: validTipo
    };

    // Validar email si existe
    if (cleanData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanData.email)) {
        return res.status(400).json({ 
          error: 'Formato de email inválido',
          field: 'email'
        });
      }
    }

    // 🔍 VERIFICACIONES DE DUPLICADOS (optimizadas)
    if (cleanData.doc || cleanData.email) {
      let duplicateChecks = [];
      let checkParams = [];
      let paramIndex = 1;

      if (cleanData.doc) {
        duplicateChecks.push(`doc = $${paramIndex}`);
        checkParams.push(cleanData.doc);
        paramIndex++;
      }

      if (cleanData.email) {
        duplicateChecks.push(`email = $${paramIndex}`);
        checkParams.push(cleanData.email);
        paramIndex++;
      }

      const duplicateQuery = `
        SELECT doc, email 
        FROM cliente 
        WHERE ${duplicateChecks.join(' OR ')}
        LIMIT 1
      `;

      const duplicateResult = await pool.query(duplicateQuery, checkParams);
      
      if (duplicateResult.rows.length > 0) {
        const existing = duplicateResult.rows[0];
        if (existing.doc === cleanData.doc) {
          return res.status(409).json({ 
            error: 'El documento ya está registrado',
            field: 'doc'
          });
        }
        if (existing.email === cleanData.email) {
          return res.status(409).json({ 
            error: 'El email ya está registrado',
            field: 'email'
          });
        }
      }
    }

    // 💾 INSERCIÓN SEGURA
    const insertQuery = `
      INSERT INTO cliente (doc, nom, dir, telefono, email, tipo)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, doc, nom, dir, telefono, email, tipo
    `;

    const values = [
      cleanData.doc,
      cleanData.nom,
      cleanData.dir,
      cleanData.telefono,
      cleanData.email,
      cleanData.tipo
    ];

    const result = await pool.query(insertQuery, values);
    const newCustomer = result.rows[0];

    // 📝 LOG DE AUDITORÍA
    console.log(`✅ Cliente creado: ${newCustomer.nom} (ID: ${newCustomer.id}) por ${req.userData.name}`);

    // 🎯 RESPUESTA OPTIMIZADA
    res.status(201).json({
      customer: newCustomer,
      message: 'Cliente creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al crear cliente:', error);
    
    // Manejo específico de errores PostgreSQL
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ 
        error: 'Documento o email ya registrado',
        code: 'DUPLICATE_ENTRY'
      });
    }

    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// 🔍 OBTENER CLIENTE POR ID - OPTIMIZADO
// =============================================
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Validación estricta de ID
    const customerId = parseInt(id);
    if (!customerId || customerId < 1 || customerId > 2147483647) {
      return res.status(400).json({ 
        error: 'ID de cliente inválido',
        received: id
      });
    }

    const query = `
      SELECT id, doc, nom, dir, telefono, email, tipo
      FROM cliente 
      WHERE id = $1
    `;

    const result = await pool.query(query, [customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        id: customerId
      });
    }

    // Cache header para optimización
    res.set('Cache-Control', 'private, max-age=300'); // 5 minutos

    res.json(result.rows[0]);

  } catch (error) {
    console.error('❌ Error al obtener cliente:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// ✏️ ACTUALIZAR CLIENTE - SEGURO Y OPTIMIZADO
// =============================================
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = parseInt(id);
    
    if (!customerId || customerId < 1) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Validaciones similares a POST...
    const { doc, nom, dir, telefono, email, tipo } = req.body;

    if (!nom || nom.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Nombre requerido',
        field: 'nom'
      });
    }

    // Verificar que existe y no hay duplicados
    const checkQuery = `
      SELECT id, nom FROM cliente 
      WHERE id = $1
    `;
    
    const existsResult = await pool.query(checkQuery, [customerId]);
    
    if (existsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Update seguro
    const updateQuery = `
      UPDATE cliente 
      SET doc = $1, nom = $2, dir = $3, telefono = $4, email = $5, tipo = $6
      WHERE id = $7
      RETURNING id, doc, nom, dir, telefono, email, tipo
    `;

    const values = [
      doc?.trim() || null,
      nom.trim(),
      dir?.trim() || null,
      telefono?.trim() || null,
      email?.trim() || null,
      tipo || 'P',
      customerId
    ];

    const result = await pool.query(updateQuery, values);

    console.log(`✅ Cliente actualizado: ${result.rows[0].nom} por ${req.userData.name}`);

    res.json({
      customer: result.rows[0],
      message: 'Cliente actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al actualizar:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// 🗑️ ELIMINAR CLIENTE - SEGURO
// =============================================
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Solo administradores pueden eliminar
    if (req.userData.role !== 'A') {
      return res.status(403).json({ 
        error: 'Solo administradores pueden eliminar clientes' 
      });
    }

    const { id } = req.params;
    const customerId = parseInt(id);

    if (!customerId || customerId < 1) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Verificar referencias antes de eliminar
    const referencesQuery = `
      SELECT COUNT(*) as count 
      FROM compra 
      WHERE cli_id = $1
    `;
    
    const referencesResult = await pool.query(referencesQuery, [customerId]);
    
    if (parseInt(referencesResult.rows[0].count) > 0) {
      return res.status(409).json({ 
        error: 'No se puede eliminar: cliente tiene ventas asociadas',
        code: 'HAS_REFERENCES'
      });
    }

    // Eliminar de forma segura
    const deleteQuery = `
      DELETE FROM cliente 
      WHERE id = $1 
      RETURNING nom
    `;
    
    const result = await pool.query(deleteQuery, [customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    console.log(`✅ Cliente eliminado: ${result.rows[0].nom} por ${req.userData.name}`);

    res.json({ 
      message: 'Cliente eliminado exitosamente',
      deletedCustomer: result.rows[0].nom
    });

  } catch (error) {
    console.error('❌ Error al eliminar:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});



// =============================================
// 🔍 BUSCAR CLIENTE POR DOCUMENTO - AGREGAR EN routes/customers.js
// =============================================
router.get('/by-document/:doc', authMiddleware, async (req, res) => {
  try {
    const { doc } = req.params;

    // Validación básica
    if (!doc || doc.trim().length < 8) {
      return res.status(400).json({ 
        error: 'Documento debe tener al menos 8 caracteres',
        received: doc
      });
    }

    // Sanitizar documento
    const cleanDoc = doc.trim().substring(0, 15);

    const query = `
      SELECT id, doc, nom, dir, telefono, email, tipo
      FROM cliente 
      WHERE doc = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [cleanDoc]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        doc: cleanDoc
      });
    }

    const customer = result.rows[0];

    // Log de búsqueda para auditoría
    console.log(`✅ Cliente encontrado por documento: ${customer.nom} (${cleanDoc}) consultado por ${req.userData.name}`);

    // Cache header para optimización
    res.set('Cache-Control', 'private, max-age=300'); // 5 minutos

    res.json({
      customer: customer
    });

  } catch (error) {
    console.error('❌ Error al buscar cliente por documento:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;