// backend/server.js - ACTUALIZADO CON PRODUCTOS
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const { testConnection } = require('./config/database');
const customersRoutes = require('./routes/customers');
const inventoryCategoriesRoutes = require('./routes/inventory/categories');
const inventoryProductsRoutes = require('./routes/inventory/products'); // ← NUEVA RUTA
const inventoryStockRoutes = require('./routes/inventory/stock');
const app = express();

// El problema era que escribí app.listener(PORT, ...) en lugar de app.listen(PORT, ...)

// Middlewares
app.use(cors({
  origin: 'http://localhost:5173', // URL de tu React app
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// 🔍 Test de conexión a la base de datos al iniciar
testConnection();

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/inventory/categories', inventoryCategoriesRoutes);
app.use('/api/inventory/products', inventoryProductsRoutes); // ← NUEVA RUTA
// En tu app.js o server.js
app.use('/api/inventory/stock', inventoryStockRoutes);
// Ruta de prueba protegida
app.get('/api/protected', authMiddleware, (req, res) => {
  console.log('🔒 Endpoint protegido accedido por:', req.userData.name);
  
  res.json({
    message: 'Esta es una ruta protegida',
    user: req.userData // Datos del usuario desde PostgreSQL
  });
});

// Ruta de prueba simple
app.get('/api/test', (req, res) => {
  res.json({
    message: '¡Backend funcionando!',
    database: 'PostgreSQL conectado',
    endpoints: [
      '/api/auth - Autenticación',
      '/api/customers - Gestión de clientes', 
      '/api/inventory/categories - Gestión de categorías',
      '/api/inventory/products - Gestión de productos', // ← ACTUALIZADO
      '/api/inventory/stock - Control de stock (próximo)',
      '/api/inventory/reports - Reportes de inventario (próximo)'
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🗄️ Base de datos: PostgreSQL (pos_system)`);
  console.log(`📋 Endpoints disponibles:`);
  console.log(`   - /api/auth - Autenticación`);
  console.log(`   - /api/customers - Gestión de clientes`);
  console.log(`   - /api/inventory/categories - Gestión de categorías`);
  console.log(`   - /api/inventory/products - Gestión de productos`); // ← ACTUALIZADO
  console.log(`   - /api/inventory/* - Módulos de inventario`);
});