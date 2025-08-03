// backend/routes/inventory/categories.js - OPTIMIZADO SIN CONTADORES
const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database'); // ← Ajustado el path
const authMiddleware = require('../../middleware/auth'); // ← Ajustado el path
const { logHelpers } = require('../../middleware/activityLogger');

// =============================================
// 🔍 OBTENER TODAS LAS CATEGORÍAS - ULTRA OPTIMIZADO
// =============================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { includeProductCount = 'false' } = req.query;
    
    const startTime = Date.now();

    // 🚀 QUERY OPTIMIZADA - SIN CONTADORES POR DEFECTO
    let query;
    
    if (includeProductCount === 'true') {
      // Solo para módulo de inventario/gestión
      query = `
        SELECT 
          f.id as familia_id,
          f.nom as familia_nom,
          sf.id as subfamilia_id,
          sf.nom as subfamilia_nom,
          (SELECT COUNT(*) FROM producto p WHERE p.sub_id = sf.id AND p.activo = true) as product_count
        FROM familia f 
        LEFT JOIN subfamilia sf ON f.id = sf.fam_id
        ORDER BY f.nom ASC, sf.nom ASC
      `;
    } else {
      // Para POS y máxima velocidad
      query = `
        SELECT 
          f.id as familia_id,
          f.nom as familia_nom,
          sf.id as subfamilia_id,
          sf.nom as subfamilia_nom
        FROM familia f 
        LEFT JOIN subfamilia sf ON f.id = sf.fam_id
        ORDER BY f.nom ASC, sf.nom ASC
      `;
    }

    const result = await pool.query(query);
    const executionTime = Date.now() - startTime;

    // 🔄 TRANSFORMAR A ESTRUCTURA JERÁRQUICA
    const familiaMap = new Map();
    
    result.rows.forEach(row => {
      const familiaId = row.familia_id;
      
      if (!familiaMap.has(familiaId)) {
        familiaMap.set(familiaId, {
          id: familiaId,
          nom: row.familia_nom,
          subfamilias: [],
          productCount: 0
        });
      }
      
      const familia = familiaMap.get(familiaId);
      
      if (row.subfamilia_id) {
        const productCount = includeProductCount === 'true' ? parseInt(row.product_count) || 0 : 0;
        
        familia.subfamilias.push({
          id: row.subfamilia_id,
          nom: row.subfamilia_nom,
          productCount: productCount
        });
        
        if (includeProductCount === 'true') {
          familia.productCount += productCount;
        }
      }
    });

    const familias = Array.from(familiaMap.values());

    // 📊 RESPUESTA OPTIMIZADA
    const response = {
      categories: familias,
      meta: {
        total_familias: familias.length,
        total_subfamilias: result.rows.filter(r => r.subfamilia_id).length,
        includeProductCount: includeProductCount === 'true',
        executionTime: `${executionTime}ms`
      }
    };

    // 🎯 HEADERS DE PERFORMANCE
    res.set({
      'Cache-Control': includeProductCount === 'true' ? 
        'private, max-age=300' : // 5 min cache con contadores
        'private, max-age=1800', // 30 min cache sin contadores
      'X-Execution-Time': `${executionTime}ms`,
      'X-Total-Categories': familias.length.toString()
    });

    console.log(`✅ Categorías cargadas en ${executionTime}ms - ${familias.length} familias`);
    
    res.json(response);

  } catch (error) {
    console.error('❌ Error al obtener categorías:', error.message);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// ➕ CREAR FAMILIA - SEGURO Y OPTIMIZADO
// =============================================
router.post('/familia', authMiddleware, async (req, res) => {
  try {
    const { nom } = req.body;

    // 🛡️ VALIDACIONES ESTRICTAS
    if (!nom || typeof nom !== 'string' || nom.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Nombre de familia requerido (mínimo 2 caracteres)',
        field: 'nom'
      });
    }

    if (nom.trim().length > 35) {
      return res.status(400).json({ 
        error: 'Nombre muy largo (máximo 35 caracteres)',
        field: 'nom'
      });
    }

    // Convertir a mayúsculas y limpiar
    const cleanNom = nom.trim().toUpperCase();

    // 🔍 VERIFICAR DUPLICADOS
    const duplicateQuery = `
      SELECT id FROM familia 
      WHERE UPPER(nom) = $1
      LIMIT 1
    `;
    
    const duplicateResult = await pool.query(duplicateQuery, [cleanNom]);
    
    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Ya existe una familia con este nombre',
        field: 'nom'
      });
    }

    // 💾 INSERCIÓN SEGURA
    const insertQuery = `
      INSERT INTO familia (nom)
      VALUES ($1)
      RETURNING id, nom
    `;

    const result = await pool.query(insertQuery, [cleanNom]);
    const newFamilia = result.rows[0];
    // 📝 AGREGAR SOLO ESTA LÍNEA AQUÍ
    await logHelpers.familyCreated(req, newFamilia.nom, newFamilia.id);
    console.log(`✅ Familia creada: ${newFamilia.nom} (ID: ${newFamilia.id}) por ${req.userData.name}`);

    res.status(201).json({
      familia: {
        id: newFamilia.id,
        nom: newFamilia.nom,
        subfamilias: [],
        productCount: 0
      },
      message: 'Familia creada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al crear familia:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ 
        error: 'Ya existe una familia con este nombre',
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
// ➕ CREAR SUBFAMILIA - SEGURO Y OPTIMIZADO
// =============================================


router.post('/subfamilia', authMiddleware, async (req, res) => {
  try {
    const { fam_id, nom } = req.body;

    // 🛡️ VALIDACIONES
    const familiaId = parseInt(fam_id);
    if (!familiaId || familiaId < 1) {
      return res.status(400).json({ 
        error: 'ID de familia inválido',
        field: 'fam_id'
      });
    }

    if (!nom || typeof nom !== 'string' || nom.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Nombre de subfamilia requerido (mínimo 2 caracteres)',
        field: 'nom'
      });
    }

    if (nom.trim().length > 35) {
      return res.status(400).json({ 
        error: 'Nombre muy largo (máximo 35 caracteres)',
        field: 'nom'
      });
    }

    // Capitalizar primera letra de cada palabra
    const cleanNom = nom.trim().replace(/\b\w/g, l => l.toUpperCase());

    // 🔍 VERIFICAR QUE EXISTE LA FAMILIA
    const familiaQuery = `
      SELECT id, nom FROM familia 
      WHERE id = $1
    `;
    
    const familiaResult = await pool.query(familiaQuery, [familiaId]);
    
    if (familiaResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Familia no encontrada',
        field: 'fam_id'
      });
    }

    // 🔍 VERIFICAR DUPLICADOS EN LA MISMA FAMILIA
    const duplicateQuery = `
      SELECT id FROM subfamilia 
      WHERE fam_id = $1 AND UPPER(nom) = $2
      LIMIT 1
    `;
    
    const duplicateResult = await pool.query(duplicateQuery, [familiaId, cleanNom.toUpperCase()]);
    
    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({ 
        error: `Ya existe una subfamilia "${cleanNom}" en la familia ${familiaResult.rows[0].nom}`,
        field: 'nom'
      });
    }

    // 💾 INSERCIÓN SEGURA
    const insertQuery = `
      INSERT INTO subfamilia (fam_id, nom)
      VALUES ($1, $2)
      RETURNING id, fam_id, nom
    `;

    const result = await pool.query(insertQuery, [familiaId, cleanNom]);
    const newSubfamilia = result.rows[0];

    // 📝 AGREGAR SOLO ESTA LÍNEA AQUÍ
    await logHelpers.subfamilyCreated(req, newSubfamilia.nom, newSubfamilia.id, familiaResult.rows[0].nom);

    console.log(`✅ Subfamilia creada: ${newSubfamilia.nom} en ${familiaResult.rows[0].nom} por ${req.userData.name}`);

    res.status(201).json({
      subfamilia: {
        id: newSubfamilia.id,
        nom: newSubfamilia.nom,
        productCount: 0
      },
      familia: familiaResult.rows[0],
      message: 'Subfamilia creada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al crear subfamilia:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: 'Ya existe una subfamilia con este nombre',
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
// ✏️ ACTUALIZAR FAMILIA

// =============================================
// ✏️ ACTUALIZAR SUBFAMILIA - CON OPCIÓN DE MOVER FAMILIA

// =============================================
// ✏️ ACTUALIZAR FAMILIA - SEGURO Y OPTIMIZADO
// =============================================
router.put('/familia/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom } = req.body;
    
    const familiaId = parseInt(id);
    if (!familiaId || familiaId < 1) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // 🛡️ VALIDACIONES ESTRICTAS
    if (!nom || typeof nom !== 'string' || nom.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Nombre de familia requerido (mínimo 2 caracteres)',
        field: 'nom'
      });
    }

    if (nom.trim().length > 35) {
      return res.status(400).json({ 
        error: 'Nombre muy largo (máximo 35 caracteres)',
        field: 'nom'
      });
    }

    // Convertir a mayúsculas y limpiar
    const cleanNom = nom.trim().toUpperCase();

    // 🔍 VERIFICAR QUE EXISTE LA FAMILIA
    const existsQuery = `
      SELECT id, nom FROM familia 
      WHERE id = $1
    `;
    
    const existsResult = await pool.query(existsQuery, [familiaId]);
    
    if (existsResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Familia no encontrada'
      });
    }

    const nombreAnterior = existsResult.rows[0].nom;

    // 🔍 VERIFICAR DUPLICADOS (excluyendo la familia actual)
    const duplicateQuery = `
      SELECT id FROM familia 
      WHERE UPPER(nom) = $1 AND id != $2
      LIMIT 1
    `;
    
    const duplicateResult = await pool.query(duplicateQuery, [cleanNom, familiaId]);
    
    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Ya existe una familia con este nombre',
        field: 'nom'
      });
    }

    // 💾 ACTUALIZACIÓN SEGURA
    const updateQuery = `
      UPDATE familia 
      SET nom = $1
      WHERE id = $2
      RETURNING id, nom
    `;

    const result = await pool.query(updateQuery, [cleanNom, familiaId]);
    const updatedFamilia = result.rows[0];

    // 📝 LOG DE ACTIVIDAD
    await logHelpers.familyUpdated(req, nombreAnterior, updatedFamilia.nom, familiaId);

    console.log(`✅ Familia actualizada: ${nombreAnterior} → ${updatedFamilia.nom} por ${req.userData.name}`);

    res.json({
      familia: {
        id: updatedFamilia.id,
        nom: updatedFamilia.nom
      },
      message: 'Familia actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al actualizar familia:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ 
        error: 'Ya existe una familia con este nombre',
        code: 'DUPLICATE_ENTRY'
      });
    }

    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});


router.put('/subfamilia/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, fam_id } = req.body; // 🆕 fam_id opcional
    
    const subfamiliaId = parseInt(id);
    if (!subfamiliaId || subfamiliaId < 1) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    if (!nom || nom.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Nombre requerido',
        field: 'nom'
      });
    }

    const cleanNom = nom.trim().replace(/\b\w/g, l => l.toUpperCase());

    // Verificar que existe y obtener familia actual
    const existsQuery = `
      SELECT sf.id, sf.fam_id, sf.nom, f.nom as familia_nom
      FROM subfamilia sf
      JOIN familia f ON sf.fam_id = f.id
      WHERE sf.id = $1
    `;
    const existsResult = await pool.query(existsQuery, [subfamiliaId]);
    
    if (existsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subfamilia no encontrada' });
    }

    const current = existsResult.rows[0];
    const nombreAnterior = current.nom;
    const targetFamId = fam_id ? parseInt(fam_id) : current.fam_id; // 🆕 Usar nueva familia o mantener actual

    // 🆕 Si cambia familia, verificar que familia destino existe
    if (targetFamId !== current.fam_id) {
      const familiaQuery = `SELECT id, nom FROM familia WHERE id = $1`;
      const familiaResult = await pool.query(familiaQuery, [targetFamId]);
      
      if (familiaResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Familia destino no encontrada',
          field: 'fam_id'
        });
      }
    }

    // Verificar duplicados en la familia destino (no en la actual)
    const duplicateQuery = `
      SELECT id FROM subfamilia 
      WHERE fam_id = $1 AND UPPER(nom) = $2 AND id != $3
      LIMIT 1
    `;
    
    const duplicateResult = await pool.query(duplicateQuery, [targetFamId, cleanNom.toUpperCase(), subfamiliaId]);
    
    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({ 
        error: `Ya existe una subfamilia "${cleanNom}" en la familia destino`,
        field: 'nom'
      });
    }

    // 🆕 Update con familia opcional
    const updateQuery = `
      UPDATE subfamilia 
      SET nom = $1, fam_id = $2
      WHERE id = $3
      RETURNING id, fam_id, nom
    `;

    const result = await pool.query(updateQuery, [cleanNom, targetFamId, subfamiliaId]);
    await logHelpers.subfamilyUpdated(req, nombreAnterior, result.rows[0].nom, subfamiliaId);
    // 🆕 Log mejorado
    const logMessage = targetFamId !== current.fam_id 
      ? `✅ Subfamilia movida: ${result.rows[0].nom} de ${current.familia_nom} a nueva familia por ${req.userData.name}`
      : `✅ Subfamilia actualizada: ${result.rows[0].nom} por ${req.userData.name}`;
    
    console.log(logMessage);

    res.json({
      subfamilia: result.rows[0],
      familyChanged: targetFamId !== current.fam_id, // 🆕 Flag para frontend
      message: 'Subfamilia actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al actualizar subfamilia:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

 
// =============================================
// 🗑️ ELIMINAR FAMILIA - SOLO ADMINISTRADORES
// =============================================
router.delete('/familia/:id', authMiddleware, async (req, res) => {
  try {
    // Solo administradores
    if (req.userData.role !== 'A') {
      return res.status(403).json({ 
        error: 'Solo administradores pueden eliminar familias' 
      });
    }

    const { id } = req.params;
    const familiaId = parseInt(id);

    if (!familiaId || familiaId < 1) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Verificar que existe
    const existsQuery = `SELECT id, nom FROM familia WHERE id = $1`;
    const existsResult = await pool.query(existsQuery, [familiaId]);
    const nombreFamilia = existsResult.rows[0].nom;
    if (existsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Familia no encontrada' });
    }

    // Verificar subfamilias
    const subfamiliasQuery = `
      SELECT COUNT(*) as count 
      FROM subfamilia 
      WHERE fam_id = $1
    `;
    const subfamiliasResult = await pool.query(subfamiliasQuery, [familiaId]);
    
    if (parseInt(subfamiliasResult.rows[0].count) > 0) {
      return res.status(409).json({ 
        error: 'No se puede eliminar: la familia tiene subfamilias asociadas',
        code: 'HAS_SUBFAMILIES',
        count: parseInt(subfamiliasResult.rows[0].count)
      });
    }

    // Verificar productos directos (si los hubiera)
    const productosQuery = `
      SELECT COUNT(*) as count 
      FROM producto p
      JOIN subfamilia sf ON p.sub_id = sf.id
      WHERE sf.fam_id = $1
    `;
    const productosResult = await pool.query(productosQuery, [familiaId]);
    
    if (parseInt(productosResult.rows[0].count) > 0) {
      return res.status(409).json({ 
        error: 'No se puede eliminar: la familia tiene productos asociados',
        code: 'HAS_PRODUCTS',
        count: parseInt(productosResult.rows[0].count)
      });
    }

    // Eliminar
    const deleteQuery = `DELETE FROM familia WHERE id = $1 RETURNING nom`;
    const result = await pool.query(deleteQuery, [familiaId]);
    await logHelpers.familyDeleted(req, nombreFamilia, familiaId);

    console.log(`✅ Familia eliminada: ${result.rows[0].nom} por ${req.userData.name}`);

    res.json({ 
      message: 'Familia eliminada exitosamente',
      deletedFamilia: result.rows[0].nom
    });

  } catch (error) {
    console.error('❌ Error al eliminar familia:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// 🗑️ ELIMINAR SUBFAMILIA - SOLO ADMINISTRADORES
// =============================================
router.delete('/subfamilia/:id', authMiddleware, async (req, res) => {
  try {
    // Solo administradores
    if (req.userData.role !== 'A') {
      return res.status(403).json({ 
        error: 'Solo administradores pueden eliminar subfamilias' 
      });
    }

    const { id } = req.params;
    const subfamiliaId = parseInt(id);

    if (!subfamiliaId || subfamiliaId < 1) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Verificar que existe
    const existsQuery = `
      SELECT sf.id, sf.nom, f.nom as familia_nom
      FROM subfamilia sf
      JOIN familia f ON sf.fam_id = f.id
      WHERE sf.id = $1
    `;
    const existsResult = await pool.query(existsQuery, [subfamiliaId]);
    const nombreSubfamilia = existsResult.rows[0].nom;
    if (existsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subfamilia no encontrada' });
    }

    // Verificar productos
    const productosQuery = `
      SELECT COUNT(*) as count 
      FROM producto 
      WHERE sub_id = $1
    `;
    const productosResult = await pool.query(productosQuery, [subfamiliaId]);
    
    if (parseInt(productosResult.rows[0].count) > 0) {
      return res.status(409).json({ 
        error: 'No se puede eliminar: la subfamilia tiene productos asociados',
        code: 'HAS_PRODUCTS',
        count: parseInt(productosResult.rows[0].count)
      });
    }

    // Eliminar
    const deleteQuery = `DELETE FROM subfamilia WHERE id = $1 RETURNING nom`;
    const result = await pool.query(deleteQuery, [subfamiliaId]);
    await logHelpers.subfamilyDeleted(req, nombreSubfamilia, subfamiliaId);
    console.log(`✅ Subfamilia eliminada: ${result.rows[0].nom} por ${req.userData.name}`);

    res.json({ 
      message: 'Subfamilia eliminada exitosamente',
      deletedSubfamilia: result.rows[0].nom
    });

  } catch (error) {
    console.error('❌ Error al eliminar subfamilia:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;