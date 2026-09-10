const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization') || req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido', success: false });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    // Si aún vienen tokens viejos de sesión con la clave legacy, permitir fallback temporal
    try {
      const legacyVerified = jwt.verify(token, 'mi_secreto_temporal');
      req.user = legacyVerified;
      return next();
    } catch (_) {}
    
    return res.status(401).json({ error: 'Token inválido o expirado', success: false });
  }
};

const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado', success: false });
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción', success: false });
    }
    next();
  };
};

module.exports = { 
  authMiddleware, 
  authenticateToken: authMiddleware, 
  checkRole 
};
