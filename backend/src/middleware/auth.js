// backend/middleware/auth.js - ACTUALIZADO PARA POSTGRESQL
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // 🔍 PASO 1: Verificar el token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-secreto-temporal');
    
    // 🔍 PASO 2: Buscar usuario en la base de datos
    const userQuery = `
      SELECT 
        id, 
        login, 
        nombre, 
        email, 
        rol, 
        activo 
      FROM usuario 
      WHERE id = $1 AND activo = true
    `;
    
    const userResult = await pool.query(userQuery, [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const user = userResult.rows[0];

    // ✅ PASO 3: Añadir datos al request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    // Datos completos del usuario desde la DB
    req.userData = {
      id: user.id,
      email: user.login,  // ← Frontend espera 'email', enviamos 'login'
      name: user.nombre,
      role: user.rol
    };

    console.log('🛡️ Usuario autenticado:', user.nombre);
    next();

  } catch (error) {
    console.error('💥 Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = authMiddleware;