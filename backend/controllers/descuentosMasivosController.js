const sql = require('mssql');
const db = require('../config/database');
const logger = require('../utils/logger');

class DescuentosMasivosController {
    
    /**
     * Importar exámenes desde Infolab
     */
    async importarExamenes(req, res) {
        try {
            const { fecha } = req.body;
            const usuario = req.user.username || 'SISTEMA';
            
            if (!fecha) {
                return res.status(400).json({
                    success: false,
                    message: 'La fecha es requerida'
                });
            }
            
            const pool = await db.getConnection();
            const result = await pool.request()
                .input('Fecha', sql.Date, fecha)
                .input('Usuario', sql.NVarChar(100), usuario)
                .execute('SP_ImportarExamenesInfolab');
            
            await pool.close();
            
            const data = result.recordset[0];
            
            if (data.Estado === 'ERROR') {
                return res.status(500).json({
                    success: false,
                    message: data.Mensaje
                });
            }
            
            res.json({
                success: true,
                data: data
            });
            
        } catch (error) {
            logger.error('Error importando exámenes:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
    
    /**
     * Obtener exámenes pendientes de una fecha
     */
    async getExamenesPendientes(req, res) {
        try {
            const { fecha } = req.query;
            
            if (!fecha) {
                return res.status(400).json({
                    success: false,
                    message: 'La fecha es requerida'
                });
            }
            
            const pool = await db.getConnection();
            
            const query = `
                SELECT 
                    T.*,
                    CASE 
                        WHEN M.id IS NOT NULL THEN 1
                        ELSE 0
                    END AS tiene_mapeo,
                    M.reactivo_id,
                    M.ConsumoPorPrueba,
                    R.nombre_prueba AS reactivo_nombre,
                    R.codigo AS reactivo_codigo
                FROM tmp_importacion_examenes T
                LEFT JOIN mapeo_pruebas_reactivos M 
                    ON T.nombre_examen = M.nombre_prueba AND M.activo = 1
                LEFT JOIN reactivos R ON M.reactivo_id = R.id
                WHERE CAST(T.fecha AS DATE) = @Fecha
                    AND T.estado = 'PENDIENTE'
                ORDER BY T.cantidad DESC, T.nombre_examen
            `;
            
            const result = await pool.request()
                .input('Fecha', sql.Date, fecha)
                .query(query);
            
            await pool.close();
            
            // Separar exámenes con y sin mapeo
            const examenes = result.recordset;
            const conMapeo = examenes.filter(e => e.tiene_mapeo);
            const sinMapeo = examenes.filter(e => !e.tiene_mapeo);
            
            res.json({
                success: true,
                data: {
                    examenes: examenes,
                    resumen: {
                        total: examenes.length,
                        con_mapeo: conMapeo.length,
                        sin_mapeo: sinMapeo.length,
                        total_pruebas: examenes.reduce((sum, e) => sum + e.cantidad, 0)
                    }
                }
            });
            
        } catch (error) {
            logger.error('Error obteniendo exámenes:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Ejecutar descuentos masivos
     */
    async ejecutarDescuentos(req, res) {
        try {
            const { fecha, modo, forzar } = req.body;
            const usuario = req.user.username;
            
            if (!fecha) {
                return res.status(400).json({
                    success: false,
                    message: 'La fecha es requerida'
                });
            }
            
            const pool = await db.getConnection();
            const result = await pool.request()
                .input('Fecha', sql.Date, fecha)
                .input('Usuario', sql.NVarChar(100), usuario)
                .input('Modo', sql.NVarChar(20), modo || 'SIMULACION')
                .input('ForzarReproceso', sql.Bit, forzar || 0)
                .execute('SP_EjecutarDescuentosMasivos');
            
            await pool.close();
            
            // El SP retorna múltiples resultsets
            const data = {
                resultado: result.recordsets[0][0] || {},
                por_reactivo: result.recordsets[1] || [],
                detalle: result.recordsets[2] || [],
                sin_mapeo: result.recordsets[3] || []
            };
            
            res.json({
                success: data.resultado.Estado === 'COMPLETADO',
                data: data
            });
            
        } catch (error) {
            logger.error('Error ejecutando descuentos:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el proceso de descuentos',
                error: error.message
            });
        }
    }
    
    /**
     * Obtener mapeos de pruebas
     */
    async getMapeos(req, res) {
        try {
            const { nombre, reactivoId, activo } = req.query;
            
            const pool = await db.getConnection();
            const result = await pool.request()
                .input('Accion', sql.NVarChar(20), 'CONSULTAR')
                .input('NombrePrueba', sql.NVarChar(200), nombre || null)
                .input('ReactivoId', sql.Int, reactivoId || null)
                .input('Activo', sql.Bit, activo !== undefined ? (activo === 'true' ? 1 : 0) : null)
                .execute('SP_GestionarMapeoPruebas');
            
            await pool.close();
            
            res.json({
                success: true,
                data: result.recordset
            });
            
        } catch (error) {
            logger.error('Error obteniendo mapeos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Crear/Actualizar mapeo
     */
    async saveMapeo(req, res) {
        try {
            const { id, nombrePrueba, reactivoId, consumoPorPrueba, activo } = req.body;
            const usuario = req.user.username;
            
            const pool = await db.getConnection();
            
            if (id) {
                // Actualizar mapeo existente
                const result = await pool.request()
                    .input('Accion', sql.NVarChar(20), 'ACTUALIZAR')
                    .input('Id', sql.Int, id)
                    .input('ConsumoPorPrueba', sql.Decimal(10,4), consumoPorPrueba)
                    .input('Activo', sql.Bit, activo !== undefined ? (activo ? 1 : 0) : null)
                    .execute('SP_GestionarMapeoPruebas');
                
                res.json({
                    success: true,
                    message: 'Mapeo actualizado correctamente'
                });
                
            } else {
                // Crear nuevo mapeo
                const result = await pool.request()
                    .input('Accion', sql.NVarChar(20), 'CREAR')
                    .input('NombrePrueba', sql.NVarChar(200), nombrePrueba)
                    .input('ReactivoId', sql.Int, reactivoId)
                    .input('ConsumoPorPrueba', sql.Decimal(10,4), consumoPorPrueba)
                    .input('Activo', sql.Bit, activo !== undefined ? (activo ? 1 : 0) : 1)
                    .execute('SP_GestionarMapeoPruebas');
                
                const data = result.recordset[0];
                
                if (data.Estado === 'EXITO') {
                    res.json({
                        success: true,
                        message: data.Mensaje,
                        id: data.Id
                    });
                } else {
                    res.status(400).json({
                        success: false,
                        message: data.Mensaje || 'Error creando mapeo'
                    });
                }
            }
            
            await pool.close();
            
        } catch (error) {
            logger.error('Error guardando mapeo:', error);
            
            if (error.number === 2627 || error.message.includes('Ya existe')) {
                res.status(400).json({
                    success: false,
                    message: 'Ya existe un mapeo para esta prueba y reactivo'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    error: error.message
                });
            }
        }
    }
    
    /**
     * Eliminar mapeo (desactivar)
     */
    async deleteMapeo(req, res) {
        try {
            const { id } = req.params;
            
            const pool = await db.getConnection();
            const result = await pool.request()
                .input('Accion', sql.NVarChar(20), 'ELIMINAR')
                .input('Id', sql.Int, id)
                .execute('SP_GestionarMapeoPruebas');
            
            await pool.close();
            
            const data = result.recordset[0];
            
            if (data.Estado === 'EXITO') {
                res.json({
                    success: true,
                    message: data.Mensaje
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: data.Mensaje || 'Error eliminando mapeo'
                });
            }
            
        } catch (error) {
            logger.error('Error eliminando mapeo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
    
    /**
     * Obtener reporte de descuentos
     */
    async getReporteDescuentos(req, res) {
        try {
            const { fecha } = req.query;
            
            const pool = await db.getConnection();
            const result = await pool.request()
                .input('Fecha', sql.Date, fecha)
                .execute('SP_ReporteDescuentosMasivos');
            
            await pool.close();
            
            // Organizar resultados
            const data = {
                resumen: result.recordsets[0] || [],
                logs: result.recordsets[1] || [],
                movimientos: result.recordsets[2] || [],
                examenes_procesados: result.recordsets[3] || [],
                examenes_sin_mapeo: result.recordsets[4] || [],
                lotes_afectados: result.recordsets[5] || []
            };
            
            res.json({
                success: true,
                data: data
            });
            
        } catch (error) {
            logger.error('Error obteniendo reporte:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando reporte'
            });
        }
    }
    
    /**
     * Obtener sugerencias de mapeo basadas en exámenes sin mapeo
     */
    async getSugerenciasMapeo(req, res) {
        try {
            const { fecha, limite } = req.query;
            
            const pool = await db.getConnection();
            
            const query = `
                SELECT TOP (@Limite)
                    T.nombre_examen,
                    T.cantidad AS total_pruebas,
                    T.fecha,
                    R.id AS reactivo_id,
                    R.nombre_prueba AS reactivo_nombre,
                    R.codigo AS reactivo_codigo,
                    COUNT(M.id) AS veces_usado,
                    (SELECT COUNT(*) FROM mapeo_pruebas_reactivos MP 
                     WHERE MP.nombre_prueba LIKE '%' + SUBSTRING(T.nombre_examen, 1, 5) + '%') AS similitud
                FROM tmp_importacion_examenes T
                CROSS APPLY (
                    SELECT TOP 3 
                        id, nombre_prueba, codigo
                    FROM reactivos
                    WHERE activo = 1
                    ORDER BY NEWID()
                ) R
                LEFT JOIN mapeo_pruebas_reactivos M ON R.id = M.reactivo_id
                WHERE T.estado = 'SIN_MAPEO'
                    AND (@Fecha IS NULL OR CAST(T.fecha AS DATE) = @Fecha)
                GROUP BY T.nombre_examen, T.cantidad, T.fecha, 
                         R.id, R.nombre_prueba, R.codigo
                ORDER BY T.cantidad DESC, similitud DESC;
            `;
            
            const result = await pool.request()
                .input('Fecha', sql.Date, fecha || null)
                .input('Limite', sql.Int, parseInt(limite) || 10)
                .query(query);
            
            await pool.close();
            
            res.json({
                success: true,
                data: result.recordset
            });
            
        } catch (error) {
            logger.error('Error obteniendo sugerencias:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo sugerencias'
            });
        }
    }
}

module.exports = new DescuentosMasivosController();