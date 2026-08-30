const { sql, getPool } = require('../config/database');

/**
 * Servicio centralizado para el registro de auditoría (Trazabilidad)
 */
class AuditService {
  async logEvent(usuarioId, accion, entidad, entidadId = null, detalles = null, direccionIp = null) {
    try {
      const pool = await getPool();
      const detalles_json = typeof detalles === 'object' ? JSON.stringify(detalles) : detalles;

      await pool.request()
        .input('usuario_id', sql.Int, usuarioId)
        .input('accion', sql.NVarChar(100), accion)
        .input('entidad', sql.NVarChar(100), entidad)
        .input('entidad_id', sql.Int, entidadId)
        .input('detalles_json', sql.NVarChar(sql.MAX), detalles_json)
        .input('direccion_ip', sql.NVarChar(50), direccionIp)
        .query(`
          INSERT INTO registro_trazabilidad (
            usuario_id, accion, entidad, entidad_id, detalles_json, direccion_ip, fecha_registro
          ) VALUES (
            @usuario_id, @accion, @entidad, @entidad_id, @detalles_json, @direccion_ip, GETDATE()
          )
        `);
      
      console.log(`[AUDIT] ${accion} en ${entidad} (ID: ${entidadId}) por Usuario ${usuarioId}`);
      return true;
    } catch (error) {
      console.error('[AUDIT ERROR] Fallo al guardar trazabilidad:', error);
      return null;
    }
  }

  async getAuditLog(filtros = {}) {
    const { usuario_id, accion, entidad, entidad_id, fecha_inicio, fecha_fin } = filtros;
    try {
      const pool = await getPool();
      let query = `
        SELECT r.*, u.usuario as username, u.nombre_completo as nombre_completo
        FROM registro_trazabilidad r
        LEFT JOIN usuarios u ON r.usuario_id = u.id
        WHERE 1=1
      `;

      const request = pool.request();

      if (usuario_id) {
        query += ` AND r.usuario_id = @usuario_id`;
        request.input('usuario_id', sql.Int, parseInt(usuario_id));
      }
      if (accion) {
        query += ` AND r.accion = @accion`;
        request.input('accion', sql.NVarChar(100), accion);
      }
      if (entidad) {
        query += ` AND r.entidad = @entidad`;
        request.input('entidad', sql.NVarChar(100), entidad);
      }
      if (entidad_id) {
        query += ` AND r.entidad_id = @entidad_id`;
        request.input('entidad_id', sql.Int, parseInt(entidad_id));
      }
      if (fecha_inicio) {
        query += ` AND r.fecha_registro >= @fecha_inicio`;
        request.input('fecha_inicio', sql.DateTime, new Date(fecha_inicio));
      }
      if (fecha_fin) {
        query += ` AND r.fecha_registro <= @fecha_fin`;
        // Para incluir todo el día en fecha de fin, le sumamos 1 día o lo definimos manual:
        let fin = new Date(fecha_fin);
        fin.setHours(23, 59, 59, 999);
        request.input('fecha_fin', sql.DateTime, fin);
      }

      query += ` ORDER BY r.fecha_registro DESC OFFSET 0 ROWS FETCH NEXT 500 ROWS ONLY`;
      
      const result = await request.query(query);

      // Transformar para que devuelva el mismo formato que esperaba el frontend:
      return result.recordset.map(row => ({
        id: row.id,
        usuario_id: row.usuario_id,
        accion: row.accion,
        entidad: row.entidad,
        entidad_id: row.entidad_id,
        detalles_json: row.detalles_json,
        direccion_ip: row.direccion_ip,
        fecha_registro: row.fecha_registro,
        usuario: {
          id: row.usuario_id,
          usuario: row.username,
          nombre_completo: row.nombre_completo
        }
      }));
    } catch (error) {
      console.error('[AUDIT ERROR] Error obteniendo log:', error);
      throw error;
    }
  }
}

module.exports = new AuditService();
