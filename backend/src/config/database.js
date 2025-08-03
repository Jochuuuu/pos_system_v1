// backend/config/database.js
const { Pool } = require('pg');
require('dotenv').config();
// Configuración de conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,              
  database: process.env.DB_NAME || 'pos_system',
  // Configuraciones adicionales para mejor performance
  max: 20,                    // máximo de conexiones en el pool
  idleTimeoutMillis: 30000,   // cerrar conexiones inactivas después de 30s
  connectionTimeoutMillis: 2000, // timeout para nuevas conexiones
});

// Test de conexión
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error en PostgreSQL:', err);
});

// Función para verificar conexión
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('🔍 Test de conexión exitoso:', result.rows[0].now);
    return true;
  } catch (err) {
    console.error('❌ Error en test de conexión:', err);
    return false;
  }
};

module.exports = {
  pool,
  testConnection
};