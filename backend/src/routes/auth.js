// backend/routes/auth.js - ACTUALIZADO PARA POSTGRESQL
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database'); // ← Importar conexión DB
const router = express.Router();

// 🔐 LOGIN CON BASE DE DATOS
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body; // Frontend sigue enviando como 'email'
    
    console.log('🔐 Intento de login para:', email,req.body);

    // 🔍 PASO 1: Buscar usuario por LOGIN en la base de datos
    const userQuery = `
      SELECT 
        id, 
        login, 
        password, 
        nombre, 
        email, 
        telefono, 
        rol, 
        activo 
      FROM usuario 
      WHERE login = $1 AND activo = true
    `;
    
    const userResult = await pool.query(userQuery, [email]); // Buscar por login
    const hashedPassword = await bcrypt.hash(password, 12);

    // ❌ Usuario no encontrado
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado:', email);
      return res.status(400).json({ 
        error: 'Usuario no encontrado o inactivo' 
      });
    }

    const user = userResult.rows[0];
    console.log('👤 Usuario encontrado:', user.nombre);

    // 🔒 PASO 2: Verificar contraseña
    // El frontend envía password en texto plano
    // El backend compara con el hash de la BD
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    console.log('🔍 Verificando contraseña...');
    console.log('📝 Password recibido (texto plano):', password);
    //console.log(user.password)
    //console.log(hashedPassword)
    console.log('🔐 Hash en BD:', user.password.substring(0, 20) + '...');
    console.log('✅ Contraseña válida:', isValidPassword);
    
    //const hashBD = '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
//const hashNuevo = '$2b$12$V5fSm1uIvbfwrk4Pqc92lObC12SivDuRcHSR0YkjVVZuRSkDZtkNG';

// Ambos deberían dar TRUE:
//console.log("aver",await bcrypt.compare("password", hashBD));    // → true ✅
//console.log("aver",await bcrypt.compare("password", hashNuevo)); // → true ✅

    if (!isValidPassword) {
      console.log('❌ Contraseña incorrecta para:', email);
      return res.status(400).json({ 
        error: 'Contraseña incorrecta' 
      });
    }

    console.log('✅ Login exitoso para:', user.nombre);

    // 📝 PASO 3: Actualizar último login en la base de datos
    const updateLoginQuery = `
      UPDATE usuario 
      SET ultimo_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    await pool.query(updateLoginQuery, [user.id]);

    // 🎫 PASO 4: Generar tokens JWT
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.login,  // ← Usar login como "email" para compatibilidad frontend
        role: user.rol 
      },
      process.env.JWT_SECRET || 'tu-secreto-temporal',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET || 'tu-refresh-secreto',
      { expiresIn: '7d' }
    );

    // 🍪 PASO 5: Configurar cookie para refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    // 📋 PASO 6: Registrar actividad en log (opcional)
    try {
      const logQuery = `
        INSERT INTO log_actividad (usuario_id, accion, categoria, descripcion) 
        VALUES ($1, $2, $3, $4)
      `;
      await pool.query(logQuery, [
        user.id, 
        'Login exitoso', 
        'ACCESO', 
        `Login: ${user.login}`
      ]);
    } catch (logError) {
      // Error en log no debe afectar el login
      console.warn('⚠️ Error al registrar log:', logError);
    }

    // ✅ PASO 7: Responder con datos del usuario
    console.log(user.rol);
    res.json({
      user: {
        id: user.id,
        email: user.login,  // ← Frontend espera 'email', enviamos 'login'
        name: user.nombre,
        role: user.rol
      },
      accessToken
    });

  } catch (error) {
    console.error('💥 Error en login:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
});

// 🔄 REFRESH TOKEN CON BASE DE DATOS
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    // 🔍 Verificar refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'tu-refresh-secreto');
    
    // 🔍 Buscar usuario en la base de datos
    const userQuery = `
      SELECT id, login, nombre, email, rol, activo 
      FROM usuario 
      WHERE id = $1 AND activo = true
    `;
    
    const userResult = await pool.query(userQuery, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = userResult.rows[0];

    // 🎫 Generar nuevo access token
    const newAccessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.login,  // ← Usar login como "email"
        role: user.rol 
      },
      process.env.JWT_SECRET || 'tu-secreto-temporal',
      { expiresIn: '15m' }
    );

    console.log('🔄 Token renovado para:', user.nombre);

    res.json({ accessToken: newAccessToken });

  } catch (error) {
    console.error('💥 Error en refresh:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// 🚪 LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logout exitoso' });
});

module.exports = router;