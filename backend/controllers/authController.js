const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/db');

const login = async (req, res) => {
  const usuario = req.body ? req.body.usuario : null;
  const contraseña = req.body ? (req.body.contraseña || req.body.contrasena || req.body.password) : null;

  console.log('🔑 Intento de login:', usuario);

  if (!usuario || !contraseña) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos', success: false });
  }

  try {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('usuario', sql.VarChar, usuario)
      .query('SELECT * FROM usuarios WHERE usuario = @usuario');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado', success: false });
    }

    const user = result.recordset[0];
    let passwordValid = false;
    let needsHashUpgrade = false;

    const storedPassword = user.contraseña || user.contrasena || user.password;

    const isBcrypt = storedPassword && (
      storedPassword.startsWith('$') || 
      storedPassword.startsWith('$') || 
      storedPassword.startsWith('$')
    );

    if (isBcrypt) {
      passwordValid = await bcrypt.compare(contraseña, storedPassword);
    } else {
      if (contraseña === storedPassword) {
        passwordValid = true;
        needsHashUpgrade = true;
      }
    }

    if (!passwordValid) {
      return res.status(401).json({ error: 'Contraseña incorrecta', success: false });
    }

    if (needsHashUpgrade) {
      try {
        const hashedPassword = await bcrypt.hash(contraseña, 12);
        await pool.request()
          .input('id', sql.Int, user.id)
          .input('hash', sql.VarChar, hashedPassword)
          .query('UPDATE usuarios SET contraseña = @hash WHERE id = @id');
        console.log('🔐 [Seguridad P1] Contraseña del usuario migrada a hash bcrypt.');
      } catch (upgradeErr) {
        console.error('Aviso: Error durante auto-migración de clave:', upgradeErr.message);
      }
    }

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, rol: user.rol },
      process.env.JWT_SECRET || 'mi_secreto_temporal',
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        usuario: user.usuario,
        correo: user.correo,
        rol: user.rol,
        nombre_completo: user.nombre_completo
      }
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ error: 'Error procesando autenticación', details: error.message, success: false });
  }
};

module.exports = { login };