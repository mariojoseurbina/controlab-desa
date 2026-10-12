const sql = require('mssql');
const { dbConfig } = require('../config/db');
const auditService = require('../services/auditService');

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .query('SELECT id, usuario, correo, rol, nombre_completo, activo, fecha_creacion FROM usuarios');
    
    await pool.close();
    res.json({ success: true, usuarios: result.recordset });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Crear nuevo usuario
const createUser = async (req, res) => {
  try {
    const { usuario, correo, contrasena, rol, nombre_completo } = req.body;
    const pool = await sql.connect(dbConfig);

    const result = await pool.request()
      .input('usuario', sql.VarChar, usuario)
      .input('correo', sql.VarChar, correo)
      .input('contraseña', sql.VarChar, contrasena)
      .input('rol', sql.VarChar, rol)
      .input('nombre_completo', sql.VarChar, nombre_completo)
      .query(`
        INSERT INTO usuarios (usuario, correo, contraseña, rol, nombre_completo)
        OUTPUT inserted.id
        VALUES (@usuario, @correo, @contraseña, @rol, @nombre_completo)
      `);

    const newUserId = result.recordset[0].id;
    
    // Trazabilidad
    await auditService.logEvent(req.user?.id || 1, 'CREAR_USUARIO', 'USUARIO', newUserId, {
      usuario, correo, rol, nombre_completo
    });

    await pool.close();
    res.json({ success: true, message: 'Usuario creado', id: newUserId });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Actualizar usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { correo, rol, nombre_completo, activo, contrasena } = req.body;
    const pool = await sql.connect(dbConfig);

    if (contrasena && contrasena.trim() !== '') {
      await pool.request()
        .input('id', sql.Int, id)
        .input('correo', sql.VarChar, correo)
        .input('rol', sql.VarChar, rol)
        .input('nombre_completo', sql.VarChar, nombre_completo)
        .input('activo', sql.Bit, activo)
        .input('contrasena', sql.VarChar, contrasena)
        .query(`\n          UPDATE usuarios \n          SET correo = @correo, rol = @rol, nombre_completo = @nombre_completo, activo = @activo, contraseña = @contrasena\n          WHERE id = @id\n        `);
    } else {
      await pool.request()
        .input('id', sql.Int, id)
        .input('correo', sql.VarChar, correo)
        .input('rol', sql.VarChar, rol)
        .input('nombre_completo', sql.VarChar, nombre_completo)
        .input('activo', sql.Bit, activo)
        .query(`\n          UPDATE usuarios \n          SET correo = @correo, rol = @rol, nombre_completo = @nombre_completo, activo = @activo\n          WHERE id = @id\n        `);
    }

    // Trazabilidad
    await auditService.logEvent(req.user?.id || 1, 'EDITAR_USUARIO', 'USUARIO', id, {
      correo, rol, nombre_completo, activo, password_changed: !!contrasena
    });

    await pool.close();
    res.json({ success: true, message: 'Usuario actualizado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};


// Eliminar usuario
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(dbConfig);

    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM usuarios WHERE id = @id');

    // Trazabilidad
    await auditService.logEvent(req.user?.id || 1, 'ELIMINAR_USUARIO', 'USUARIO', id, {
      accion: 'Eliminado del sistema'
    });

    await pool.close();
    res.json({ success: true, message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Verificar token
const verifyToken = async (req, res) => {
  res.json({ success: true, user: req.user });
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  verifyToken
};




