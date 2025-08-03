// backend/routes/inventory/stock.js
const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const authMiddleware = require('../../middleware/auth');

// =============================================
// 🔍 OBTENER TODAS LAS ENTRADAS DE STOCK
// =============================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search = '',
      cliente_id = '',
      fecha_desde = '',
      fecha_hasta = '',
      incluye_igv = ''
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(5, parseInt(limit) || 25));
    const offset = (pageNum - 1) * limitNum;

    // 🔍 CONSTRUCCIÓN DE FILTROS
    let whereConditions = ['c.tipo_operacion = $1']; // Solo entradas de stock
    let queryParams = ['C']; // C = Compra/Entrada
    let paramIndex = 2;

    // Filtro por búsqueda (número o proveedor)
    if (search && search.trim().length >= 2) {
      whereConditions.push(`(
        c.num::text ILIKE $${paramIndex} OR 
        cl.nom ILIKE $${paramIndex} OR
        cl.doc ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Filtro por cliente/proveedor específico
    if (cliente_id && parseInt(cliente_id) > 0) {
      whereConditions.push(`c.cli_id = $${paramIndex}`);
      queryParams.push(parseInt(cliente_id));
      paramIndex++;
    }

    // Filtro por fecha desde
    if (fecha_desde) {
      whereConditions.push(`DATE(c.fecha) >= $${paramIndex}`);
      queryParams.push(fecha_desde);
      paramIndex++;
    }

    // Filtro por fecha hasta
    if (fecha_hasta) {
      whereConditions.push(`DATE(c.fecha) <= $${paramIndex}`);
      queryParams.push(fecha_hasta);
      paramIndex++;
    }

    // Filtro por IGV
    if (incluye_igv === 'true' || incluye_igv === 'false') {
      whereConditions.push(`(c.igv > 0) = $${paramIndex}`);
      queryParams.push(incluye_igv === 'true');
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // 📊 QUERY PRINCIPAL - ENTRADAS DE STOCK
    const mainQuery = `
      SELECT 
        c.id,
        c.num as numero,
        c.cli_id,
        c.tipo,
        c.fecha,
        c.subtotal,
        c.igv,
        c.desc_total,
        c.total,
        cl.nom as cliente_nom,
        cl.doc as cliente_doc,
        cl.tipo as cliente_tipo,
        COUNT(d.id) as total_productos,
        SUM(d.cant) as total_cantidad
      FROM compra c
      LEFT JOIN cliente cl ON c.cli_id = cl.id
      LEFT JOIN detalle d ON c.id = d.compra_id
      ${whereClause}
      GROUP BY c.id, c.num, c.cli_id, c.tipo, c.fecha, c.subtotal, c.igv, c.desc_total, c.total,
               cl.nom, cl.doc, cl.tipo
      ORDER BY c.fecha DESC, c.num DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limitNum, offset);

    // Query para contar total
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM compra c
      LEFT JOIN cliente cl ON c.cli_id = cl.id
      ${whereClause}
    `;

    const startTime = Date.now();
    
    // Ejecutar ambas queries
    const [entriesResult, countResult] = await Promise.all([
      pool.query(mainQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)) // Sin limit y offset
    ]);

    const entries = entriesResult.rows.map(row => ({
      id: row.id,
      numero: row.numero,
      fecha_entrada: row.fecha,
      cliente_id: row.cli_id,
      cliente_doc: row.cliente_doc,
      cliente_nom: row.cliente_nom,
      cliente_tipo: row.cliente_tipo,
      subtotal: parseFloat(row.subtotal),
      igv: parseFloat(row.igv),
      desc_total: parseFloat(row.desc_total),
      total_pagado: parseFloat(row.total),
      incluye_igv: parseFloat(row.igv) > 0,
      total_productos: parseInt(row.total_productos),
      total_cantidad: parseFloat(row.total_cantidad) || 0
    }));

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);
    const executionTime = Date.now() - startTime;

    // 📤 RESPUESTA ESTRUCTURADA
    const response = {
      entries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      filters: {
        search: search || null,
        cliente_id: cliente_id ? parseInt(cliente_id) : null,
        fecha_desde: fecha_desde || null,
        fecha_hasta: fecha_hasta || null,
        incluye_igv: incluye_igv || null
      },
      meta: {
        executionTime: `${executionTime}ms`,
        resultsCount: entries.length
      }
    };

    // Headers de performance
    res.set({
      'Cache-Control': 'private, max-age=60',
      'X-Execution-Time': `${executionTime}ms`,
      'X-Total-Entries': total.toString()
    });

    console.log(`✅ Entradas de stock cargadas en ${executionTime}ms - ${entries.length}/${total} entradas`);
    
    res.json(response);

  } catch (error) {
    console.error('❌ Error al obtener entradas de stock:', error.message);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// ➕ CREAR ENTRADA DE STOCK
// =============================================
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      cliente_id, 
      cliente_doc, 
      observaciones, 
      total_pagado, 
      incluye_igv = false,
      productos 
    } = req.body;

    // 🛡️ VALIDACIONES BÁSICAS
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ 
        error: 'Debe incluir al menos un producto',
        field: 'productos'
      });
    }

    const totalPagadoNum = parseFloat(total_pagado);
    if (!totalPagadoNum || totalPagadoNum <= 0) {
      return res.status(400).json({ 
        error: 'Total pagado debe ser mayor a 0',
        field: 'total_pagado'
      });
    }

    // Validar productos
    for (let i = 0; i < productos.length; i++) {
      const prod = productos[i];
      
      if (!prod.producto_cod || !prod.producto_cod.trim()) {
        return res.status(400).json({ 
          error: `Producto ${i + 1}: código requerido`,
          field: `productos[${i}].producto_cod`
        });
      }

      const cantidad = parseFloat(prod.cantidad);
      if (!cantidad || cantidad <= 0) {
        return res.status(400).json({ 
          error: `Producto ${i + 1}: cantidad debe ser mayor a 0`,
          field: `productos[${i}].cantidad`
        });
      }

      const precioCompra = parseFloat(prod.precio_compra);
      if (!precioCompra || precioCompra <= 0) {
        return res.status(400).json({ 
          error: `Producto ${i + 1}: precio de compra debe ser mayor a 0`,
          field: `productos[${i}].precio_compra`
        });
      }
    }

    await client.query('BEGIN');

    // 🔍 VERIFICAR QUE EXISTEN TODOS LOS PRODUCTOS
    const productCodes = productos.map(p => p.producto_cod.trim());
    const productsQuery = `
      SELECT cod, descripcion, stock 
      FROM producto 
      WHERE cod = ANY($1) AND activo = TRUE
    `;
    
    const productsResult = await client.query(productsQuery, [productCodes]);
    
    if (productsResult.rows.length !== productCodes.length) {
      const foundCodes = productsResult.rows.map(p => p.cod);
      const missingCodes = productCodes.filter(code => !foundCodes.includes(code));
      
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        error: `Productos no encontrados: ${missingCodes.join(', ')}`,
        missingProducts: missingCodes
      });
    }

    const productosValidados = productsResult.rows;

    // 🔍 VERIFICAR CLIENTE SI SE ESPECIFICA
    let clienteValidado = null;
    if (cliente_id) {
      const clienteQuery = `SELECT id, nom, doc, tipo FROM cliente WHERE id = $1`;
      const clienteResult = await client.query(clienteQuery, [parseInt(cliente_id)]);
      
      if (clienteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: 'Cliente/Proveedor no encontrado',
          field: 'cliente_id'
        });
      }
      
      clienteValidado = clienteResult.rows[0];
    }

    // 💰 CALCULAR TOTALES
    const subtotalCalculado = productos.reduce((total, prod) => {
      return total + (parseFloat(prod.cantidad) * parseFloat(prod.precio_compra));
    }, 0);

    const igvMonto = incluye_igv ? (totalPagadoNum - subtotalCalculado) : 0;

    // 💾 INSERTAR ENTRADA DE STOCK (compra)
    const insertCompraQuery = `
      INSERT INTO compra (
        cli_id, 
        tipo, 
        tipo_operacion,
        subtotal, 
        igv, 
        desc_total, 
        total,
        usuario_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, num, fecha
    `;

    const compraResult = await client.query(insertCompraQuery, [
      cliente_id ? parseInt(cliente_id) : null,
      'B', // Boleta por defecto
      'C', // C = Compra/Entrada
      subtotalCalculado,
      Math.max(0, igvMonto), // IGV manual
      0, // Sin descuentos
      totalPagadoNum,
      req.userData.id // Usuario que registra
    ]);

    const nuevaCompra = compraResult.rows[0];

    // 💾 INSERTAR DETALLES (esto disparará el trigger de stock automáticamente)
    const productosInsertados = [];
    
    for (const prod of productos) {
      const insertDetalleQuery = `
        INSERT INTO detalle (
          compra_id, 
          prod_cod, 
          cant, 
          precio, 
          desc_monto
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const detalleResult = await client.query(insertDetalleQuery, [
        nuevaCompra.id,
        prod.producto_cod.trim(),
        parseFloat(prod.cantidad),
        parseFloat(prod.precio_compra),
        0 // Sin descuentos
      ]);

      // Buscar info del producto para la respuesta
      const prodInfo = productosValidados.find(p => p.cod === prod.producto_cod.trim());
      
      productosInsertados.push({
        id: detalleResult.rows[0].id,
        producto_cod: prod.producto_cod.trim(),
        descripcion: prodInfo.descripcion,
        cantidad: parseFloat(prod.cantidad),
        precio_compra: parseFloat(prod.precio_compra),
        precio_calculado_automaticamente: Boolean(prod.precio_calculado_automaticamente),
        subtotal: parseFloat(prod.cantidad) * parseFloat(prod.precio_compra),
        stock_anterior: parseFloat(prodInfo.stock),
        stock_nuevo: parseFloat(prodInfo.stock) + parseFloat(prod.cantidad)
      });
    }

    // 📝 LOG DE ACTIVIDAD PRINCIPAL
    await client.query(`
      INSERT INTO log_actividad (usuario_id, accion, categoria, descripcion, monto)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      req.userData.id,
      'ENTRADA_STOCK',
      'INVENTARIO',
      `Entrada #${nuevaCompra.num} - ${productos.length} productos - ${clienteValidado ? clienteValidado.nom : 'Sin proveedor'}${observaciones ? ` - ${observaciones}` : ''}`,
      totalPagadoNum
    ]);

    await client.query('COMMIT');

    // 📤 RESPUESTA EXITOSA
    const entryResponse = {
      id: nuevaCompra.id,
      numero: nuevaCompra.num,
      fecha_entrada: nuevaCompra.fecha,
      cliente_id: cliente_id ? parseInt(cliente_id) : null,
      cliente_doc: cliente_doc || null,
      cliente_nom: clienteValidado ? clienteValidado.nom : null,
      observaciones: observaciones || null,
      subtotal: subtotalCalculado,
      igv: Math.max(0, igvMonto),
      total_pagado: totalPagadoNum,
      incluye_igv: incluye_igv,
      productos: productosInsertados,
      total_productos: productos.length,
      total_cantidad: productos.reduce((sum, p) => sum + parseFloat(p.cantidad), 0)
    };

    console.log(`✅ Entrada de stock creada: #${nuevaCompra.num} - ${productos.length} productos por ${req.userData.name}`);

    res.status(201).json({
      entry: entryResponse,
      message: 'Entrada de stock registrada exitosamente'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear entrada de stock:', error);
    
    // Manejar errores específicos
    if (error.message.includes('Sobregiro muy alto')) {
      return res.status(400).json({ 
        error: 'Error en stock: ' + error.message,
        code: 'STOCK_ERROR'
      });
    }
    
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ 
        error: 'Producto o cliente no válido',
        code: 'INVALID_REFERENCE'
      });
    }

    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  } finally {
    client.release();
  }
});

// =============================================
// 🔍 OBTENER ENTRADA DE STOCK ESPECÍFICA
// =============================================
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const entryId = parseInt(id);

    if (!entryId || entryId < 1) {
      return res.status(400).json({ 
        error: 'ID de entrada inválido',
        received: id
      });
    }

    // Query principal para la entrada
    const entryQuery = `
      SELECT 
        c.id,
        c.num as numero,
        c.cli_id,
        c.tipo,
        c.fecha,
        c.subtotal,
        c.igv,
        c.desc_total,
        c.total,
        cl.nom as cliente_nom,
        cl.doc as cliente_doc,
        cl.tipo as cliente_tipo,
        u.nombre as usuario_nom
      FROM compra c
      LEFT JOIN cliente cl ON c.cli_id = cl.id
      LEFT JOIN usuario u ON c.usuario_id = u.id
      WHERE c.id = $1 AND c.tipo_operacion = 'C'
    `;

    // Query para los productos
    const productsQuery = `
      SELECT 
        d.id,
        d.prod_cod,
        d.cant,
        d.precio,
        d.desc_monto,
        p.descripcion,
        p.unidad,
        p.stock as stock_actual
      FROM detalle d
      JOIN producto p ON d.prod_cod = p.cod
      WHERE d.compra_id = $1
      ORDER BY d.id
    `;

    const [entryResult, productsResult] = await Promise.all([
      pool.query(entryQuery, [entryId]),
      pool.query(productsQuery, [entryId])
    ]);

    if (entryResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Entrada de stock no encontrada',
        id: entryId
      });
    }

    const entry = entryResult.rows[0];
    const productos = productsResult.rows.map(row => ({
      id: row.id,
      producto_cod: row.prod_cod,
      descripcion: row.descripcion,
      cantidad: parseFloat(row.cant),
      precio_compra: parseFloat(row.precio),
      descuento: parseFloat(row.desc_monto),
      subtotal: parseFloat(row.cant) * (parseFloat(row.precio) - parseFloat(row.desc_monto)),
      unidad: row.unidad,
      stock_actual: parseFloat(row.stock_actual)
    }));

    const response = {
      entry: {
        id: entry.id,
        numero: entry.numero,
        fecha_entrada: entry.fecha,
        cliente_id: entry.cli_id,
        cliente_doc: entry.cliente_doc,
        cliente_nom: entry.cliente_nom,
        cliente_tipo: entry.cliente_tipo,
        subtotal: parseFloat(entry.subtotal),
        igv: parseFloat(entry.igv),
        total_pagado: parseFloat(entry.total),
        incluye_igv: parseFloat(entry.igv) > 0,
        usuario_nom: entry.usuario_nom,
        productos: productos,
        total_productos: productos.length,
        total_cantidad: productos.reduce((sum, p) => sum + p.cantidad, 0)
      }
    };

    // Cache header
    res.set('Cache-Control', 'private, max-age=300'); // 5 minutos

    res.json(response);

  } catch (error) {
    console.error('❌ Error al obtener entrada de stock:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// 📊 ESTADÍSTICAS DE ENTRADAS DE STOCK
// =============================================
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const diasNum = Math.min(365, Math.max(1, parseInt(dias) || 30));

    const statsQuery = `
      SELECT 
        COUNT(*) as total_entradas,
        SUM(c.total) as monto_total,
        AVG(c.total) as promedio_entrada,
        SUM(CASE WHEN c.igv > 0 THEN 1 ELSE 0 END) as entradas_con_igv,
        COUNT(DISTINCT c.cli_id) as proveedores_distintos,
        SUM(subq.total_productos) as productos_totales,
        SUM(subq.cantidad_total) as cantidad_total
      FROM compra c
      LEFT JOIN (
        SELECT 
          compra_id,
          COUNT(*) as total_productos,
          SUM(cant) as cantidad_total
        FROM detalle 
        GROUP BY compra_id
      ) subq ON c.id = subq.compra_id
      WHERE c.tipo_operacion = 'C'
      AND c.fecha >= CURRENT_DATE - INTERVAL '${diasNum} days'
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    res.json({
      periodo: `Últimos ${diasNum} días`,
      estadisticas: {
        total_entradas: parseInt(stats.total_entradas),
        monto_total: parseFloat(stats.monto_total) || 0,
        promedio_entrada: parseFloat(stats.promedio_entrada) || 0,
        entradas_con_igv: parseInt(stats.entradas_con_igv),
        proveedores_distintos: parseInt(stats.proveedores_distintos),
        productos_totales: parseInt(stats.productos_totales) || 0,
        cantidad_total: parseFloat(stats.cantidad_total) || 0
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;