// backend/routes/inventory/products.js
const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const authMiddleware = require('../../middleware/auth');
const { logHelpers } = require('../../middleware/activityLogger');

// =============================================
// 🔍 OBTENER TODOS LOS PRODUCTOS - OPTIMIZADO CON FILTROS
// =============================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      sub_id = '', 
      fam_id = '',
      activo = 'true',
      includeInactive = 'false'
    } = req.query;
    
    const startTime = Date.now();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 🔍 CONSTRUIR QUERY DINÁMICO
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtro por activo/inactivo
    if (includeInactive !== 'true') {
      whereConditions.push(`p.activo = $${paramIndex}`);
      queryParams.push(activo === 'true');
      paramIndex++;
    }

    // Filtro por búsqueda (descripción o código)
    if (search.trim()) {
      whereConditions.push(`(
        UPPER(p.descripcion) LIKE $${paramIndex} OR 
        UPPER(p.cod) LIKE $${paramIndex}
      )`);
      queryParams.push(`%${search.trim().toUpperCase()}%`);
      paramIndex++;
    }

    // Filtro por subfamilia específica
    if (sub_id && parseInt(sub_id) > 0) {
      whereConditions.push(`p.sub_id = $${paramIndex}`);
      queryParams.push(parseInt(sub_id));
      paramIndex++;
    }

    // Filtro por familia (a través de subfamilia)
    if (fam_id && parseInt(fam_id) > 0 && !sub_id) {
      whereConditions.push(`sf.fam_id = $${paramIndex}`);
      queryParams.push(parseInt(fam_id));
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // 🚀 QUERY PRINCIPAL CON JOINS OPTIMIZADOS
    const mainQuery = `
      SELECT 
        p.cod,
        p.sub_id,
        p.descripcion,
        p.p_compra,
        p.p_venta,
        p.unidad,
        p.stock,
        p.activo,
        sf.nom as subfamilia_nom,
        sf.fam_id,
        f.nom as familia_nom
      FROM producto p
      JOIN subfamilia sf ON p.sub_id = sf.id
      JOIN familia f ON sf.fam_id = f.id
      ${whereClause}
      ORDER BY p.descripcion ASC, p.cod ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(parseInt(limit), offset);

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM producto p
      JOIN subfamilia sf ON p.sub_id = sf.id
      JOIN familia f ON sf.fam_id = f.id
      ${whereClause}
    `;

    // Ejecutar ambas queries
    const [productsResult, countResult] = await Promise.all([
      pool.query(mainQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)) // Sin limit y offset
    ]);

    const products = productsResult.rows.map(row => ({
      cod: row.cod,
      sub_id: row.sub_id,
      subfamilia: row.sub_id, // Para compatibilidad con frontend
      descripcion: row.descripcion,
      p_compra: parseFloat(row.p_compra),
      p_venta: parseFloat(row.p_venta),
      unidad: row.unidad,
      stock: parseFloat(row.stock),
      activo: row.activo,
      // Información adicional para navegación
      subfamilia_nom: row.subfamilia_nom,
      familia_nom: row.familia_nom,
      fam_id: row.fam_id
    }));

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit));
    const executionTime = Date.now() - startTime;

    // 📊 RESPUESTA ESTRUCTURADA
    const response = {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      filters: {
        search: search || null,
        sub_id: sub_id ? parseInt(sub_id) : null,
        fam_id: fam_id ? parseInt(fam_id) : null,
        includeInactive: includeInactive === 'true'
      },
      meta: {
        executionTime: `${executionTime}ms`,
        resultsCount: products.length
      }
    };

    // 🎯 HEADERS DE PERFORMANCE
    res.set({
      'Cache-Control': 'private, max-age=300', // 5 min cache
      'X-Execution-Time': `${executionTime}ms`,
      'X-Total-Products': total.toString(),
      'X-Page': page.toString(),
      'X-Total-Pages': totalPages.toString()
    });

    console.log(`✅ Productos cargados en ${executionTime}ms - ${products.length}/${total} productos`);
    
    res.json(response);

  } catch (error) {
    console.error('❌ Error al obtener productos:', error.message);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// 🔍 OBTENER PRODUCTO POR CÓDIGO
// =============================================
router.get('/:cod', authMiddleware, async (req, res) => {
  try {
    const { cod } = req.params;

    if (!cod || cod.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Código de producto requerido' 
      });
    }

    const query = `
      SELECT 
        p.cod,
        p.sub_id,
        p.descripcion,
        p.p_compra,
        p.p_venta,
        p.unidad,
        p.stock,
        p.activo,
        sf.nom as subfamilia_nom,
        sf.fam_id,
        f.nom as familia_nom
      FROM producto p
      JOIN subfamilia sf ON p.sub_id = sf.id
      JOIN familia f ON sf.fam_id = f.id
      WHERE p.cod = $1
    `;

    const result = await pool.query(query, [cod.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Producto no encontrado',
        cod: cod.trim()
      });
    }

    const product = result.rows[0];
    
    res.json({
      product: {
        cod: product.cod,
        sub_id: product.sub_id,
        subfamilia: product.sub_id,
        descripcion: product.descripcion,
        p_compra: parseFloat(product.p_compra),
        p_venta: parseFloat(product.p_venta),
        unidad: product.unidad,
        stock: parseFloat(product.stock),
        activo: product.activo,
        subfamilia_nom: product.subfamilia_nom,
        familia_nom: product.familia_nom,
        fam_id: product.fam_id
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener producto:', error.message);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// ➕ CREAR PRODUCTO - SEGURO Y VALIDADO
// =============================================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      cod, 
      sub_id, 
      descripcion, 
      p_compra, 
      p_venta, 
      unidad = 'U', 
      stock = 1,
      activo = true 
    } = req.body;

    // 🛡️ VALIDACIONES ESTRICTAS
    if (!cod || typeof cod !== 'string' || cod.trim().length < 3) {
      return res.status(400).json({ 
        error: 'Código de barras requerido (mínimo 3 caracteres)',
        field: 'cod'
      });
    }

    if (cod.trim().length > 15) {
      return res.status(400).json({ 
        error: 'Código muy largo (máximo 15 caracteres)',
        field: 'cod'
      });
    }

    if (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Descripción requerida (mínimo 2 caracteres)',
        field: 'descripcion'
      });
    }

    if (descripcion.trim().length > 45) {
      return res.status(400).json({ 
        error: 'Descripción muy larga (máximo 45 caracteres)',
        field: 'descripcion'
      });
    }

    const subfamiliaId = parseInt(sub_id);
    if (!subfamiliaId || subfamiliaId < 1) {
      return res.status(400).json({ 
        error: 'ID de subfamilia inválido',
        field: 'sub_id'
      });
    }

    const precioCompra = parseFloat(p_compra);
    const precioVenta = parseFloat(p_venta);

    if (!precioCompra || precioCompra <= 0) {
      return res.status(400).json({ 
        error: 'Precio de compra debe ser mayor a 0',
        field: 'p_compra'
      });
    }

    if (!precioVenta || precioVenta <= 0) {
      return res.status(400).json({ 
        error: 'Precio de venta debe ser mayor a 0',
        field: 'p_venta'
      });
    }

    if (precioVenta < precioCompra) {
      return res.status(400).json({ 
        error: 'Precio de venta debe ser mayor o igual al de compra',
        field: 'p_venta'
      });
    }

    if (!['U', 'K', 'P'].includes(unidad)) {
      return res.status(400).json({ 
        error: 'Unidad debe ser U (Unidad), K (Kilogramo) o P (Paquete)',
        field: 'unidad'
      });
    }

    const stockValue = stock !== undefined ? parseFloat(stock) : 1; // ← Default stock = 1
    if (isNaN(stockValue) || stockValue < 0) {
      return res.status(400).json({ 
        error: 'Stock debe ser un número positivo',
        field: 'stock'
      });
    }

    // Limpiar datos
    const cleanCod = cod.trim();
    const cleanDescripcion = descripcion.trim();

    // 🔍 VERIFICAR QUE EXISTE LA SUBFAMILIA
    const subfamiliaQuery = `
      SELECT sf.id, sf.nom, f.nom as familia_nom
      FROM subfamilia sf
      JOIN familia f ON sf.fam_id = f.id
      WHERE sf.id = $1
    `;
    
    const subfamiliaResult = await pool.query(subfamiliaQuery, [subfamiliaId]);
    
    if (subfamiliaResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Subfamilia no encontrada',
        field: 'sub_id'
      });
    }

    // 🔍 VERIFICAR CÓDIGO DUPLICADO
    const duplicateQuery = `
      SELECT cod FROM producto 
      WHERE cod = $1
      LIMIT 1
    `;
    
    const duplicateResult = await pool.query(duplicateQuery, [cleanCod]);
    
    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Ya existe un producto con este código de barras',
        field: 'cod'
      });
    }

    // 💾 INSERCIÓN SEGURA
    const insertQuery = `
      INSERT INTO producto (cod, sub_id, descripcion, p_compra, p_venta, unidad, stock, activo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING cod, sub_id, descripcion, p_compra, p_venta, unidad, stock, activo
    `;

    const result = await pool.query(insertQuery, [
      cleanCod,
      subfamiliaId,
      cleanDescripcion,
      precioCompra,
      precioVenta,
      unidad,
      stockValue,
      activo
    ]);

    const newProduct = result.rows[0];

    // 📝 LOG DE ACTIVIDAD
    await logHelpers.productCreated(req, newProduct.descripcion, newProduct.cod);

    console.log(`✅ Producto creado: ${newProduct.descripcion} (${newProduct.cod}) por ${req.userData.name}`);

    res.status(201).json({
      product: {
        cod: newProduct.cod,
        sub_id: newProduct.sub_id,
        subfamilia: newProduct.sub_id,
        descripcion: newProduct.descripcion,
        p_compra: parseFloat(newProduct.p_compra),
        p_venta: parseFloat(newProduct.p_venta),
        unidad: newProduct.unidad,
        stock: parseFloat(newProduct.stock),
        activo: newProduct.activo,
        subfamilia_nom: subfamiliaResult.rows[0].nom,
        familia_nom: subfamiliaResult.rows[0].familia_nom
      },
      message: 'Producto creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ 
        error: 'Ya existe un producto con este código',
        code: 'DUPLICATE_ENTRY'
      });
    }

    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ 
        error: 'Subfamilia no válida',
        code: 'INVALID_SUBFAMILY'
      });
    }

    if (error.code === '23514') { // Check constraint violation
      return res.status(400).json({ 
        error: 'Datos no válidos (verificar precios, stock o unidad)',
        code: 'INVALID_DATA'
      });
    }

    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// ✏️ ACTUALIZAR PRODUCTO - SEGURO Y VALIDADO
// =============================================
router.put('/:cod', authMiddleware, async (req, res) => {
  try {
    // Solo Admin y Supervisor pueden editar
    if (!['A', 'S'].includes(req.userData.role)) {
      return res.status(403).json({ 
        error: 'Solo administradores y supervisores pueden editar productos' 
      });
    }

    const { cod } = req.params;
    const { 
      sub_id, 
      descripcion, 
      p_compra, 
      p_venta, 
      unidad, 
      stock,
      activo 
    } = req.body;

    if (!cod || cod.trim().length === 0) {
      return res.status(400).json({ error: 'Código de producto requerido' });
    }

    // 🔍 VERIFICAR QUE EXISTE EL PRODUCTO
    const existsQuery = `
      SELECT p.*, sf.nom as subfamilia_nom, f.nom as familia_nom
      FROM producto p
      JOIN subfamilia sf ON p.sub_id = sf.id
      JOIN familia f ON sf.fam_id = f.id
      WHERE p.cod = $1
    `;
    
    const existsResult = await pool.query(existsQuery, [cod.trim()]);
    
    if (existsResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Producto no encontrado'
      });
    }

    const currentProduct = existsResult.rows[0];

    // 🛡️ VALIDACIONES (similares a POST pero opcionales)
    const updates = {};
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (sub_id !== undefined) {
      const subfamiliaId = parseInt(sub_id);
      if (!subfamiliaId || subfamiliaId < 1) {
        return res.status(400).json({ 
          error: 'ID de subfamilia inválido',
          field: 'sub_id'
        });
      }

      // Verificar que existe la subfamilia
      const subfamiliaQuery = `SELECT id FROM subfamilia WHERE id = $1`;
      const subfamiliaResult = await pool.query(subfamiliaQuery, [subfamiliaId]);
      
      if (subfamiliaResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Subfamilia no encontrada',
          field: 'sub_id'
        });
      }

      updateFields.push(`sub_id = $${paramIndex}`);
      updateValues.push(subfamiliaId);
      updates.sub_id = subfamiliaId;
      paramIndex++;
    }

    if (descripcion !== undefined) {
      if (!descripcion || descripcion.trim().length < 2) {
        return res.status(400).json({ 
          error: 'Descripción requerida (mínimo 2 caracteres)',
          field: 'descripcion'
        });
      }

      if (descripcion.trim().length > 45) {
        return res.status(400).json({ 
          error: 'Descripción muy larga (máximo 45 caracteres)',
          field: 'descripcion'
        });
      }

      updateFields.push(`descripcion = $${paramIndex}`);
      updateValues.push(descripcion.trim());
      updates.descripcion = descripcion.trim();
      paramIndex++;
    }

    if (p_compra !== undefined) {
      const precioCompra = parseFloat(p_compra);
      if (!precioCompra || precioCompra <= 0) {
        return res.status(400).json({ 
          error: 'Precio de compra debe ser mayor a 0',
          field: 'p_compra'
        });
      }

      updateFields.push(`p_compra = $${paramIndex}`);
      updateValues.push(precioCompra);
      updates.p_compra = precioCompra;
      paramIndex++;
    }

    if (p_venta !== undefined) {
      const precioVenta = parseFloat(p_venta);
      if (!precioVenta || precioVenta <= 0) {
        return res.status(400).json({ 
          error: 'Precio de venta debe ser mayor a 0',
          field: 'p_venta'
        });
      }

      // Verificar contra precio de compra (actual o nuevo)
      const finalPrecioCompra = updates.p_compra || currentProduct.p_compra;
      if (precioVenta < finalPrecioCompra) {
        return res.status(400).json({ 
          error: 'Precio de venta debe ser mayor o igual al de compra',
          field: 'p_venta'
        });
      }

      updateFields.push(`p_venta = $${paramIndex}`);
      updateValues.push(precioVenta);
      updates.p_venta = precioVenta;
      paramIndex++;
    }

    if (unidad !== undefined) {
      if (!['U', 'K', 'P'].includes(unidad)) {
        return res.status(400).json({ 
          error: 'Unidad debe ser U (Unidad), K (Kilogramo) o P (Paquete)',
          field: 'unidad'
        });
      }

      updateFields.push(`unidad = $${paramIndex}`);
      updateValues.push(unidad);
      updates.unidad = unidad;
      paramIndex++;
    }

    if (stock !== undefined) {
      const stockValue = parseFloat(stock);
      if (isNaN(stockValue) || stockValue < 0) {
        return res.status(400).json({ 
          error: 'Stock debe ser un número positivo',
          field: 'stock'
        });
      }

      updateFields.push(`stock = $${paramIndex}`);
      updateValues.push(stockValue);
      updates.stock = stockValue;
      paramIndex++;
    }

    if (activo !== undefined) {
      updateFields.push(`activo = $${paramIndex}`);
      updateValues.push(Boolean(activo));
      updates.activo = Boolean(activo);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        error: 'No hay campos para actualizar'
      });
    }

    // 💾 ACTUALIZACIÓN SEGURA
    updateValues.push(cod.trim()); // Para la cláusula WHERE
    const updateQuery = `
      UPDATE producto 
      SET ${updateFields.join(', ')}
      WHERE cod = $${paramIndex}
      RETURNING cod, sub_id, descripcion, p_compra, p_venta, unidad, stock, activo
    `;

    const result = await pool.query(updateQuery, updateValues);
    const updatedProduct = result.rows[0];

    // Obtener información completa para la respuesta
    const fullProductQuery = `
      SELECT p.*, sf.nom as subfamilia_nom, f.nom as familia_nom
      FROM producto p
      JOIN subfamilia sf ON p.sub_id = sf.id
      JOIN familia f ON sf.fam_id = f.id
      WHERE p.cod = $1
    `;
    
    const fullProductResult = await pool.query(fullProductQuery, [cod.trim()]);
    const fullProduct = fullProductResult.rows[0];

    // 📝 LOG DE ACTIVIDAD
    await logHelpers.productUpdated(req, updatedProduct.descripcion, updatedProduct.cod);

    console.log(`✅ Producto actualizado: ${updatedProduct.descripcion} (${updatedProduct.cod}) por ${req.userData.name}`);

    res.json({
      product: {
        cod: fullProduct.cod,
        sub_id: fullProduct.sub_id,
        subfamilia: fullProduct.sub_id,
        descripcion: fullProduct.descripcion,
        p_compra: parseFloat(fullProduct.p_compra),
        p_venta: parseFloat(fullProduct.p_venta),
        unidad: fullProduct.unidad,
        stock: parseFloat(fullProduct.stock),
        activo: fullProduct.activo,
        subfamilia_nom: fullProduct.subfamilia_nom,
        familia_nom: fullProduct.familia_nom
      },
      message: 'Producto actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al actualizar producto:', error);
    
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ 
        error: 'Subfamilia no válida',
        code: 'INVALID_SUBFAMILY'
      });
    }

    if (error.code === '23514') { // Check constraint violation
      return res.status(400).json({ 
        error: 'Datos no válidos (verificar precios, stock o unidad)',
        code: 'INVALID_DATA'
      });
    }

    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// 🗑️ ELIMINAR PRODUCTO - SOLO ADMINISTRADORES
// =============================================
router.delete('/:cod', authMiddleware, async (req, res) => {
  try {
    // Solo administradores
    if (req.userData.role !== 'A') {
      return res.status(403).json({ 
        error: 'Solo administradores pueden eliminar productos' 
      });
    }

    const { cod } = req.params;

    if (!cod || cod.trim().length === 0) {
      return res.status(400).json({ error: 'Código de producto requerido' });
    }

    // Verificar que existe
    const existsQuery = `SELECT cod, descripcion FROM producto WHERE cod = $1`;
    const existsResult = await pool.query(existsQuery, [cod.trim()]);
    
    if (existsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const product = existsResult.rows[0];

    // TODO: Verificar si tiene ventas asociadas (cuando se implemente módulo de ventas)
    // const ventasQuery = `SELECT COUNT(*) as count FROM venta_detalle WHERE cod_producto = $1`;
    // const ventasResult = await pool.query(ventasQuery, [cod.trim()]);
    // if (parseInt(ventasResult.rows[0].count) > 0) {
    //   return res.status(409).json({ 
    //     error: 'No se puede eliminar: el producto tiene ventas asociadas',
    //     code: 'HAS_SALES'
    //   });
    // }

    // Eliminar producto
    const deleteQuery = `DELETE FROM producto WHERE cod = $1 RETURNING descripcion`;
    const result = await pool.query(deleteQuery, [cod.trim()]);

    // 📝 LOG DE ACTIVIDAD
    await logHelpers.productDeleted(req, product.descripcion, product.cod);

    console.log(`✅ Producto eliminado: ${result.rows[0].descripcion} (${cod.trim()}) por ${req.userData.name}`);

    res.json({ 
      message: 'Producto eliminado exitosamente',
      deletedProduct: {
        cod: cod.trim(),
        descripcion: result.rows[0].descripcion
      }
    });

  } catch (error) {
    console.error('❌ Error al eliminar producto:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;