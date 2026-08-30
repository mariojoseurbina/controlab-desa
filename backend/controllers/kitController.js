const { executeQuery } = require('../config/database');

class KitController {
    // Agregar reactivo a kit
    async agregarReactivoAKit(req, res) {
        try {
            const { kit_id, inventario_id, ml_por_prueba, obligatorio } = req.body;
            
            await executeQuery(`
                INSERT INTO kit_reactivos (kit_id, inventario_id, ml_por_prueba, obligatorio)
                VALUES (@kit_id, @inventario_id, @ml_por_prueba, @obligatorio)
            `, [
                { name: 'kit_id', value: kit_id },
                { name: 'inventario_id', value: inventario_id },
                { name: 'ml_por_prueba', value: ml_por_prueba },
                { name: 'obligatorio', value: obligatorio }
            ]);

            res.json({ success: true, message: 'Reactivo agregado al kit' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Obtener reactivos de un kit
    async getReactivosDeKit(req, res) {
        try {
            const { kit_id } = req.params;
            
            const result = await executeQuery(`
                SELECT kr.*, lr.NumeroLote, lr.ConsumoPorPrueba, lr.CantidadActual
                FROM kit_reactivos kr
                INNER JOIN LotesReactivos lr ON kr.inventario_id = lr.InventarioId
                WHERE kr.kit_id = @kit_id
            `, [{ name: 'kit_id', value: kit_id }]);

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Eliminar reactivo de un kit
    async eliminarReactivoDeKit(req, res) {
        try {
            const { id } = req.params;
            
            await executeQuery(`DELETE FROM kit_reactivos WHERE id = @id`, [
                { name: 'id', value: id }
            ]);

            res.json({ success: true, message: 'Reactivo eliminado del kit' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Obtener kits disponibles
    async getKitsDisponibles(req, res) {
        try {
            const result = await executeQuery(`
                SELECT id, codigo_kit, nombre_kit 
                FROM kits_prueba 
                WHERE activo = 1
            `);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Obtener lotes disponibles
    async getLotesDisponibles(req, res) {
        try {
            const result = await executeQuery(`
                SELECT 
                    InventarioId,
                    NumeroLote,
                    CantidadActual,
                    ConsumoPorPrueba,
                    FechaVencimiento
                FROM LotesReactivos 
                WHERE Estado = 'Activo' 
                AND CantidadActual > 0
                ORDER BY FechaVencimiento ASC
            `);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new KitController();