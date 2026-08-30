const { executeStoredProcedure, executeQuery } = require('../config/database');

class AutomaticProcessController {
    // Ejecutar proceso automático
    async ejecutarProceso(req, res) {
        try {
            const { fecha } = req.body;
            const result = await executeStoredProcedure('sp_ProcesarConsumoDiario', [
                { name: 'FechaProceso', value: fecha }
            ]);
            
            res.json({
                success: true,
                message: 'Proceso ejecutado correctamente',
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener vinculaciones examen-kit
    async getVinculaciones(req, res) {
        try {
            const result = await executeQuery(`
                SELECT ekv.*, e.Reporte as examen_nombre 
                FROM examen_kit_vinculo ekv
                RIGHT JOIN LIS.dbo.Examenes e ON ekv.examen_nombre = e.Reporte
                WHERE e.Estado = 'Activo'
            `);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Guardar vinculación
    async saveVinculacion(req, res) {
        try {
            const { examen_nombre, kit_codigo, usuario } = req.body;
            
            await executeQuery(`
                IF EXISTS (SELECT 1 FROM examen_kit_vinculo WHERE examen_nombre = @examen_nombre)
                    UPDATE examen_kit_vinculo 
                    SET codigo_kit = @kit_codigo, usuario_creacion = @usuario 
                    WHERE examen_nombre = @examen_nombre
                ELSE
                    INSERT INTO examen_kit_vinculo (examen_nombre, codigo_kit, usuario_creacion)
                    VALUES (@examen_nombre, @kit_codigo, @usuario)
            `, [
                { name: 'examen_nombre', value: examen_nombre },
                { name: 'kit_codigo', value: kit_codigo },
                { name: 'usuario', value: usuario }
            ]);

            res.json({ success: true, message: 'Vinculación guardada' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Obtener logs de proceso
    async getLogs(req, res) {
        try {
            const result = await executeQuery(`
                SELECT * FROM log_proceso_automatico 
                ORDER BY fecha_ejecucion DESC
            `);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AutomaticProcessController();
