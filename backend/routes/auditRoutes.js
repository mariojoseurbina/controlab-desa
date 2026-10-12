const express = require('express');
const router = express.Router();
const { getAuditLog } = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Solo usuarios autenticados pueden ver la auditorÃ­a
router.get('/', authenticateToken, getAuditLog);



// NUEVO ENDPOINT: Reporte de Trazabilidad Global por Lote (Rendimiento)
router.get('/lotes-global', authenticateToken, async (req, res) => {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        const todasLasCajas = await prisma.lotesReactivos.findMany();
        const items = await prisma.itemInventario.findMany();
        
        // Obtener desglose de pruebas del sniffer
        const logs = await prisma.logSniffer.findMany({
            where: { lote_afectado_id: { not: null } }
        });
        const snifferCounts = {};
        logs.forEach(l => {
            if(!snifferCounts[l.lote_afectado_id]) snifferCounts[l.lote_afectado_id] = { rutina: 0, rpt: 0, cal: 0, qc: 0 };
            if (l.is_qc) snifferCounts[l.lote_afectado_id].qc++;
            else if (l.is_calibracion) snifferCounts[l.lote_afectado_id].cal++;
            else if (l.is_repeticion) snifferCounts[l.lote_afectado_id].rpt++;
            else snifferCounts[l.lote_afectado_id].rutina++;
        });

        const lotesMap = {};
        
        todasLasCajas.forEach(caja => {
            const key = caja.NumeroLote + '|' + caja.InventarioId;
            if (!lotesMap[key]) {
                lotesMap[key] = {
                    NumeroLote: caja.NumeroLote,
                    InventarioId: caja.InventarioId,
                    CajasTotales: 0,
                    PruebasTeoricasTotales: 0,
                    VolumenTeoricoTotal: 0,
                    VolumenFisicoRestante: 0,
                    VolumenExcedente: 0,
                    rutina: 0, rpt: 0, cal: 0, qc: 0
                };
            }
            
            lotesMap[key].CajasTotales += 1;
            lotesMap[key].PruebasTeoricasTotales += (caja.PruebasTeoricas || 0);
            
            // Sumar counts del sniffer si existen para el ID de esta caja
            if (snifferCounts[caja.Id]) {
                lotesMap[key].rutina += snifferCounts[caja.Id].rutina;
                lotesMap[key].rpt += snifferCounts[caja.Id].rpt;
                lotesMap[key].cal += snifferCounts[caja.Id].cal;
                lotesMap[key].qc += snifferCounts[caja.Id].qc;
            }

            lotesMap[key].VolumenTeoricoTotal += Number(caja.CantidadInicial || 0);
            
            const actual = Number(caja.CantidadActual || 0);
            if (actual > 0) {
                lotesMap[key].VolumenFisicoRestante += actual;
            } else if (actual < 0) {
                lotesMap[key].VolumenExcedente += Math.abs(actual);
            }
        });

        const report = Object.values(lotesMap).map(lote => {
            const item = items.find(i => i.id === lote.InventarioId);
            const consumido = lote.VolumenTeoricoTotal - lote.VolumenFisicoRestante + lote.VolumenExcedente;
            
            let rendimientoObj = "Normal";
            if (lote.VolumenExcedente > 0) {
                rendimientoObj = "Excedente";
            }

            return {
                NumeroLote: lote.NumeroLote,
                ReactivoNombre: item ? item.nombre : 'Desconocido',
                CajasTotales: lote.CajasTotales,
                PruebasTeoricasTotales: lote.PruebasTeoricasTotales,
                VolumenTeoricoTotal: lote.VolumenTeoricoTotal,
                VolumenConsumidoTotal: consumido,
                VolumenFisicoRestante: lote.VolumenFisicoRestante,
                VolumenExcedente: lote.VolumenExcedente,
                EstadoRendimiento: rendimientoObj,
                RentabilidadPorcentaje: lote.VolumenTeoricoTotal > 0 ? ((consumido / lote.VolumenTeoricoTotal) * 100).toFixed(2) : 0,
                PruebasPacientes: lote.rutina,
                PruebasRepeticiones: lote.rpt,
                PruebasCalibraciones: lote.cal,
                PruebasControlCalidad: lote.qc
            };
        });

        res.json({ success: true, data: report });
    } catch (error) {
        console.error('Error en reporte de lotes:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

module.exports = router;



