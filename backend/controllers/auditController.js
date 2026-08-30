const auditService = require('../services/auditService');

const getAuditLog = async (req, res) => {
  try {
    const filtros = {
      usuario_id: req.query.usuario_id,
      accion: req.query.accion,
      entidad: req.query.entidad,
      entidad_id: req.query.entidad_id,
      fecha_inicio: req.query.fecha_inicio,
      fecha_fin: req.query.fecha_fin
    };

    const logs = await auditService.getAuditLog(filtros);
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error obteniendo trazabilidad:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor al consultar auditoría' });
  }
};

module.exports = {
  getAuditLog
};
