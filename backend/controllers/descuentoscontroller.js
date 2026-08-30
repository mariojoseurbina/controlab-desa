//////// ARCHVO INGRESADO 11/12/2025 ///////


const sql = require('mssql');
const db = require('../config/database');

class DescuentosController {
    // Obtener pruebas del día actual
    async getPruebasDia(req, res) {
        try {
            const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
            const pool = await db.getConnection();
            
            const result = await pool.request()
                .input('Fecha', sql.Date, fecha)
                .execute('sp_ObtenerEstadisticasControlab');
            
            res.json({ success: true, data: result.recordset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Importar pruebas del día
    async importarPruebas(req, res) {
        try {
            const { fecha } = req.body;
            const fechaActual = fecha || new Date().toISOString().split('T')[0];
            const pool = await db.getConnection();
            
            const result = await pool.request()
                .input('Fecha', sql.Date, fechaActual)
                .execute('sp_ImportarEstadisticasDiarias');
            
            res.json({ success: true, data: result.recordset[0] });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Obtener todos los mapeos
    async getMapeos(req, res) {
        try {
            const pool = await db.getConnection();
            const query = `
                SELECT m.*, r.nombre as reactivo_nombre, r.codigo
                FROM mapeo_pruebas_reactivos m
                LEFT JOIN items_inventario r ON m.reactivo_id = r.id
                WHERE m.activo = 1
                ORDER BY m.nombre_prueba
            `;
            
            const result = await pool.request().query(query);
            res.json({ success: true, data: result.recordset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Guardar nuevo mapeo
    async saveMapeo(req, res) {
        try {
            const { nombre_prueba, reactivo_id, consumo_por_prueba } = req.body;
            const usuario = req.user?.username || 'SISTEMA';
            const pool = await db.getConnection();
            
            const query = `
                INSERT INTO mapeo_pruebas_reactivos 
                (nombre_prueba, reactivo_id, consumo_por_prueba, activo, creado_por)
                VALUES (@nombre_prueba, @reactivo_id, @consumo_por_prueba, 1, @usuario)
            `;
            
            await pool.request()
                .input('nombre_prueba', sql.NVarChar(200), nombre_prueba)
                .input('reactivo_id', sql.Int, reactivo_id)
                .input('consumo_por_prueba', sql.Decimal(10,4), consumo_por_prueba)
                .input('usuario', sql.NVarChar(100), usuario)
                .query(query);
            
            res.json({ success: true, message: 'Mapeo creado correctamente' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Simular descuento
    async simularDescuento(req, res) {
        try {
            const { fecha } = req.body;
            const usuario = req.user?.username || 'SISTEMA';
            const pool = await db.getConnection();
            
            const result = await pool.request()
                .input('Fecha', sql.Date, fecha)
                .input('Usuario', sql.NVarChar(100), usuario)
                .input('Modo', sql.NVarChar(20), 'SIMULACION')
                .input('ForzarReproceso', sql.Bit, 0)
                .execute('SP_EjecutarDescuentosMasivos');
            
            res.json({ success: true, data: result.recordset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Ejecutar descuento real
    async ejecutarDescuento(req, res) {
        try {
            const { fecha } = req.body;
            const usuario = req.user?.username || 'SISTEMA';
            const pool = await db.getConnection();
            
            const result = await pool.request()
                .input('Fecha', sql.Date, fecha)
                .input('Usuario', sql.NVarChar(100), usuario)
                .input('Modo', sql.NVarChar(20), 'EJECUCION')
                .input('ForzarReproceso', sql.Bit, 0)
                .execute('SP_EjecutarDescuentosMasivos');
            
            res.json({ success: true, data: result.recordset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Obtener historial
    async getHistorial(req, res) {
        try {
            const { limit = 20, fechaInicio, fechaFin } = req.query;
            const pool = await db.getConnection();
            
            let query = `
                SELECT TOP ${parseInt(limit)} *
                FROM log_proceso_automatico
                WHERE 1=1
            `;
            
            const request = pool.request();
            
            if (fechaInicio) {
                query += ` AND fecha_ejecucion >= @fechaInicio`;
                request.input('fechaInicio', sql.DateTime, `${fechaInicio} 00:00:00`);
            }
            if (fechaFin) {
                query += ` AND fecha_ejecucion <= @fechaFin`;
                request.input('fechaFin', sql.DateTime, `${fechaFin} 23:59:59`);
            }
            
            query += ` ORDER BY fecha_ejecucion DESC`;
            
            const result = await request.query(query);
            
            // Adaptar los datos al formato esperado por el frontend
            const mappedData = result.recordset.map(record => {
                let usuario = 'admin';
                if (record.mensaje_error) {
                    const match = record.mensaje_error.match(/Usuario:\s*([^\s|]+)/);
                    if (match) usuario = match[1];
                }
                
                return {
                    id: record.id,
                    fecha_proceso: record.fecha_ejecucion,
                    fecha_inicio: record.fecha_ejecucion,
                    fecha_fin: record.fecha_ejecucion,
                    usuario: usuario,
                    modo: record.mensaje_error && record.mensaje_error.includes('SIMULACION') ? 'SIMULACION' : 'EJECUCION',
                    estado: record.estado,
                    detalles: record.mensaje_error,
                    examenes_procesados: record.examenes_procesados,
                    reactivos_afectados: record.reactivos_afectados
                };
            });
            
            res.json({ success: true, data: mappedData });
        } catch (error) {
            console.error('Error al obtener historial:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Actualizar mapeo
    async updateMapeo(req, res) {
        try {
            const { id } = req.params;
            const { activo } = req.body;
            const pool = await db.getConnection();
            
            await pool.request()
                .input('id', sql.Int, id)
                .input('activo', sql.Bit, activo !== undefined ? (activo ? 1 : 0) : 0)
                .query('UPDATE mapeo_pruebas_reactivos SET activo = @activo, fecha_actualizacion = GETDATE() WHERE id = @id');
            
            res.json({ success: true, message: 'Mapeo actualizado correctamente' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Obtener reporte
    async getReporte(req, res) {
        try {
            const { fecha } = req.params;
            const pool = await db.getConnection();
            
            const result = await pool.request()
                .input('Fecha', sql.Date, fecha)
                .query(`
                    SELECT * FROM log_proceso_automatico 
                    WHERE CAST(fecha_ejecucion AS DATE) = @Fecha
                    ORDER BY fecha_ejecucion DESC
                `);
            
            const mappedData = result.recordset.map(record => {
                let usuario = 'admin';
                if (record.mensaje_error) {
                    const match = record.mensaje_error.match(/Usuario:\s*([^\s|]+)/);
                    if (match) usuario = match[1];
                }
                
                return {
                    id: record.id,
                    fecha_proceso: record.fecha_ejecucion,
                    fecha_inicio: record.fecha_ejecucion,
                    fecha_fin: record.fecha_ejecucion,
                    usuario: usuario,
                    modo: record.mensaje_error && record.mensaje_error.includes('SIMULACION') ? 'SIMULACION' : 'EJECUCION',
                    estado: record.estado,
                    detalles: record.mensaje_error,
                    examenes_procesados: record.examenes_procesados,
                    reactivos_afectados: record.reactivos_afectados
                };
            });
            
            res.json({ success: true, data: mappedData });
        } catch (error) {
            console.error('Error al obtener reporte:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new DescuentosController();