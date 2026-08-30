// routes/consumoRealRoutes.js
const express = require('express');
const router = express.Router();
const SistemaConsumoReal = require('../controllers/consumoController');
const { getPool } = require('../config/database');

router.post('/procesar-examenes-pendientes', async (req, res) => {
    try {
        const pool = await getPool();
        const sistema = new SistemaConsumoReal(pool);
        
        // Verificar stock primero
        const verificacion = await sistema.verificarStockDisponible();
        const conStockInsuficiente = verificacion.filter(v => v.estado_stock === 'INSUFICIENTE');
        
        if (conStockInsuficiente.length > 0) {
            return res.json({
                success: false,
                message: 'Stock insuficiente para algunos reactivos',
                data: {
                    verificacion: verificacion,
                    insuficientes: conStockInsuficiente.map(v => ({
                        prueba: v.nombre_prueba,
                        necesario: v.ml_necesarios,
                        disponible: v.stock_disponible_ml,
                        diferencia: v.ml_necesarios - v.stock_disponible_ml
                    }))
                }
            });
        }
        
        // Procesar exámenes
        const resultado = await sistema.procesarTodosExamenesPendientes();
        
        res.json({
            success: true,
            message: resultado.message,
            data: resultado.data
        });
        
    } catch (error) {
        console.error('Error en /procesar-examenes-pendientes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/verificar-stock', async (req, res) => {
    try {
        const pool = await getPool();
        const sistema = new SistemaConsumoReal(pool);
        const verificacion = await sistema.verificarStockDisponible();
        
        res.json({
            success: true,
            data: {
                totalExamenesPendientes: verificacion.reduce((sum, v) => sum + parseFloat(v.pruebas_pendientes || 0), 0),
                verificacion: verificacion,
                resumen: {
                    suficientes: verificacion.filter(v => v.estado_stock === 'SUFICIENTE').length,
                    insuficientes: verificacion.filter(v => v.estado_stock === 'INSUFICIENTE').length,
                    totalMlNecesarios: verificacion.reduce((sum, v) => sum + parseFloat(v.ml_necesarios || 0), 0),
                    totalMlDisponibles: verificacion.reduce((sum, v) => sum + parseFloat(v.stock_disponible_ml || 0), 0)
                }
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/estado-lotes/:reactivoId?', async (req, res) => {
    try {
        const { reactivoId } = req.params;
        
        let query = `
            SELECT 
                lr.*,
                DATEDIFF(day, GETDATE(), lr.FechaVencimiento) as dias_vencimiento,
                (lr.CantidadActual / NULLIF(lr.ConsumoPorPrueba, 0)) as pruebas_posibles,
                CASE 
                    WHEN lr.CantidadActual <= 0 THEN 'AGOTADO'
                    WHEN lr.CantidadActual <= (lr.ConsumoPorPrueba * 5) THEN 'CRÍTICO'
                    WHEN lr.CantidadActual <= (lr.ConsumoPorPrueba * 15) THEN 'BAJO'
                    WHEN DATEDIFF(day, GETDATE(), lr.FechaVencimiento) <= 30 THEN 'POR VENCER'
                    ELSE 'NORMAL'
                END as nivel_alerta
            FROM LotesReactivos lr
            WHERE lr.CantidadActual > 0
                AND lr.Estado = 'Activo'
        `;
        
        const pool = await getPool();
        const request = pool.request();
        
        if (reactivoId) {
            query += ' AND lr.InventarioId = @reactivoId';
            request.input('reactivoId', reactivoId);
        }
        
        query += ' ORDER BY lr.FechaFabricacion ASC';
        
        const result = await request.query(query);
        
        // Calcular totales
        const totales = result.recordset.reduce((acc, lote) => {
            acc.mlTotal += parseFloat(lote.CantidadActual);
            acc.pruebasTotal += parseFloat(lote.pruebas_posibles) || 0;
            return acc;
        }, { mlTotal: 0, pruebasTotal: 0 });
        
        res.json({
            success: true,
            data: {
                lotes: result.recordset,
                totales: totales,
                cantidadLotes: result.recordset.length
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;