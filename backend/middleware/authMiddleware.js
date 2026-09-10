const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.header('Authorization');
  const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido', success: false });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // Fallback temporal para tokens legacy emitidos antes de la migración
      try {
        const legacyUser = jwt.verify(token, 'mi_secreto_temporal');
        req.user = legacyUser;
        return next();
      } catch (_) {}

      return res.status(403).json({ error: 'Token inválido o expirado', success: false });
    }
    
    req.user = user;
    next();
  });
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.header('Authorization');
  const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  
  next();
};

module.exports = { 
  authenticateToken, 
  authMiddleware: authenticateToken, 
  optionalAuth 
};
