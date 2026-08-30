const jwt = require('jsonwebtoken');
const sql = require('mssql');
const { dbConfig } = require('../config/db');

const login = async (req, res) => {
  console.log('🔐 Login intent:', req.body.usuario);
  
  const { usuario, contraseña } = req.body;

  try {
    // CONEXIÓN DIRECTA - SIN DEPENDER DE app.locals
    const pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('usuario', sql.VarChar, usuario)
      .query('SELECT * FROM usuarios WHERE usuario = @usuario');

    if (result.recordset.length === 0) {
      await pool.close();
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = result.recordset[0];
    
    // Comparación directa (sin bcrypt por ahora)
    if (contraseña !== user.contraseña) {
      await pool.close();
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, rol: user.rol },
      'mi_secreto_temporal'
    );

    await pool.close();

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
    res.status(500).json({ error: error.message });
  }
};

module.exports = { login };