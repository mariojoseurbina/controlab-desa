const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/db');

const login = async (req, res) => {
  console.log('🔐 Intento de login:', req.body.usuario);
  
  const { usuario, contraseña } = req.body;

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

    // Verificar si la clave almacenada ya tiene formato bcrypt ($2a$, $2b$ o $2y$)
    const isBcrypt = user.contraseña && (
      user.contraseña.startsWith('$2a$') || 
      user.contraseña.startsWith('$2b$') || 
      user.contraseña.startsWith('$2y$')
    );

    if (isBcrypt) {
      passwordValid = await bcrypt.compare(contraseña, user.contraseña);
    } else {
      // Validación para contraseñas legacy en texto plano
      if (contraseña === user.contraseña) {
        passwordValid = true;
        needsHashUpgrade = true;
      }
    }

    if (!passwordValid) {
      return res.status(401).json({ error: 'Contraseña incorrecta', success: false });
    }

    // Auto-migración transparente: si la clave estaba en texto plano, hashearla a bcrypt en la BD
    if (needsHashUpgrade) {
      try {
        const hashedPassword = await bcrypt.hash(contraseña, 12);
        await pool.request()
          .input('id', sql.Int, user.id)
          .input('hash', sql.VarChar, hashedPassword)
          .query('UPDATE usuarios SET contraseña = @hash WHERE id = @id');
        console.log(`🔒 [Seguridad P1] Contraseña del usuario '${usuario}' migrada automáticamente a hash bcrypt.`);
      } catch (upgradeErr) {
        console.error('Aviso: Error durante auto-migración de clave:', upgradeErr.message);
      }
    }

    // Generar token JWT seguro con expiración de 12 horas
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
