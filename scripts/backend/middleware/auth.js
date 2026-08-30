const jwt = require('jsonwebtoken');
const sql = require('mssql');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const pool = req.app.locals.pool;
    
    const result = await pool.request()
      .input('id', sql.Int, decoded.id)
      .query('SELECT id, usuario, correo, rol, nombre_completo, activo FROM usuarios WHERE id = @id AND activo = 1');
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Token inválido. Usuario no encontrado.' });
    }
    
    req.user = result.recordset[0];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Permisos insuficientes.' 
      });
    }
    next();
  };
};

module.exports = { auth, authorize };