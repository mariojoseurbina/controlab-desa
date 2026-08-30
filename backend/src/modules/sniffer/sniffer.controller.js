const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Webhook para recibir datos del Sniffer y procesar el descuento de reactivos
exports.webhookSniffer = async (req, res) => {
    try {
        const { 
            raw_frame, 
            test_name, 
            patient_id, 
            is_qc, 
            is_calibracion, 
            is_repeticion, 
            equipo_origen, 
            timestamp 
        } = req.body;

        if (!test_name || !patient_id) {
            return res.status(400).json({ success: false, message: 'test_name y patient_id son requeridos.' });
        }

        const dev_name = equipo_origen || 'UNKNOWN_DEVICE';
        const raw_text = raw_frame || '';
        const pid_lower = patient_id.toLowerCase();

        // 1. Auto-detección de tipo de corrida
        const isQcAuto = is_qc || pid_lower.startsWith('qc') || pid_lower.startsWith('ctrl') || pid_lower.includes('control');
        const isCalAuto = is_calibracion || pid_lower.startsWith('cal') || pid_lower.startsWith('std') || pid_lower.includes('standard') || pid_lower.includes('calib');
        
        let isRepAuto = is_repeticion || false;

        // Auto-detectar repeticiones si el mismo equipo corrió la misma prueba para el mismo paciente en los últimos 10 min
        if (!isRepAuto && !isQcAuto && !isCalAuto) {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const prevLog = await prisma.logSniffer.findFirst({
                where: {
                    patient_id: patient_id,
                    test_name: test_name,
                    equipo_origen: dev_name,
                    fecha_registro: { gte: tenMinutesAgo }
                }
            });
            if (prevLog) {
                isRepAuto = true;
            }
        }

        let loteAfectadoId = null;
        let mlDescontados = 0;
        let logMessage = "Log registrado exitosamente.";
        let descuentoExitoso = false;

        // 2. Mapeo Flexible: código del equipo → reactivo del inventario
        // El sniffer v2 envía tanto test_name (nombre legible) como test_id_equipo (código crudo)
        const test_id_equipo = req.body.test_id_equipo || null;
        
        // Intentar mapeo en orden de confiabilidad:
        // A) Por código exacto del equipo, B) Por nombre, C) Por patrón flexible
        let mapeo = null;

        if (test_id_equipo) {
            mapeo = await prisma.mapeo_pruebas_reactivos.findFirst({
                where: { activo: true, codigo_equipo: { equals: test_id_equipo } }
            });
        }

        if (!mapeo && test_name) {
            mapeo = await prisma.mapeo_pruebas_reactivos.findFirst({
                where: {
                    activo: true,
                    OR: [
                        { nombre_prueba:   { contains: test_name } },
                        { patron_busqueda: { contains: test_name } },
                        { codigo_equipo:   { contains: test_name } }
                    ]
                }
            });
        }

        // Fallback: comparar el nombre del test contra el nombre del item en inventario
        if (!mapeo && test_name) {
            const itemDirecto = await prisma.itemInventario.findFirst({
                where: {
                    activo: true,
                    OR: [
                        { nombre:   { contains: test_name, mode: 'insensitive' } },
                        { codigo:   { contains: test_name, mode: 'insensitive' } }
                    ]
                },
                select: { id: true }
            });
            if (itemDirecto) {
                // Crear un mapeo virtual en memoria para este caso
                mapeo = { reactivo_id: itemDirecto.id, consumo_por_prueba: 1 };
            }
        }

        if (mapeo) {
            // Multiplicar consumo si es QC o Calibración (suelen consumir el doble o triple)
            let mlAConsumir = Number(mapeo.consumo_por_prueba) || 0;
            
            // Buscar lote activo para ese reactivo (FEFO: primero el que vence antes)
            const loteActivo = await prisma.lotesReactivos.findFirst({
                where: {
                    InventarioId: mapeo.reactivo_id,
                    Estado: 'Activo',
                    CantidadActual: { gt: 0 }
                },
                orderBy: { FechaVencimiento: 'asc' }
            });

            if (loteActivo && mlAConsumir > 0) {
                loteAfectadoId = loteActivo.Id;
                mlDescontados = mlAConsumir;
                const nuevaCantidad = Math.max(0, Number(loteActivo.CantidadActual) - mlAConsumir);

                // A. Actualizar la cantidad del lote de reactivos
                await prisma.lotesReactivos.update({
                    where: { Id: loteActivo.Id },
                    data: { CantidadActual: nuevaCantidad }
                });

                // Obtener datos de conversión del item de inventario para el log
                const itemInv = await prisma.itemInventario.findUnique({
                    where: { id: mapeo.reactivo_id },
                    select: { frascos_por_caja: true, volumen_por_frasco_ml: true, unidad: true }
                });

                const volFrasco = Number(itemInv?.volumen_por_frasco_ml) || 100;
                const frascosCaja = Number(itemInv?.frascos_por_caja) || 6;
                const frascosRestantes = (nuevaCantidad / volFrasco).toFixed(1);
                const cajasRestantes = (nuevaCantidad / (volFrasco * frascosCaja)).toFixed(2);

                // B. Registrar movimiento en Kárdex
                const tipoCorrida = isCalAuto ? 'CALIBRACION' : isQcAuto ? 'QC' : isRepAuto ? 'REPETICION' : 'NORMAL';
                await prisma.movimientoInventario.create({
                    data: {
                        item_id:         mapeo.reactivo_id,
                        tipo_movimiento: 'CONSUMO',
                        cantidad:        mlAConsumir,
                        stock_anterior:  0,
                        stock_nuevo:     0,
                        motivo:    `Consumo Sniffer (${tipoCorrida}) - ${dev_name}`,
                        referencia: `Lote: ${loteActivo.NumeroLote} (${frascosRestantes} frascos / ${cajasRestantes} cajas rest.)`,
                        creado_por:      1
                    }
                });

                descuentoExitoso = true;
                logMessage = `✅ Descontados ${mlAConsumir}ml del lote ${loteActivo.NumeroLote} [${tipoCorrida}]. Restan ${frascosRestantes} frascos (${cajasRestantes} Cajas).`;
            } else {
                logMessage = `⚠️ Sin lote activo con stock para el reactivo ID ${mapeo.reactivo_id}.`;
            }
        } else {
            logMessage = `📋 Prueba "${test_name}" (${test_id_equipo || 'sin código'}) sin mapeo configurado. Agregala en la pantalla de Mapeo de Pruebas.`;
        }

        // 3. Crear el registro en log_sniffer
        const newLog = await prisma.logSniffer.create({
            data: {
                test_name: test_name,
                patient_id: patient_id,
                is_qc: isQcAuto,
                is_calibracion: isCalAuto,
                is_repeticion: isRepAuto,
                equipo_origen: dev_name,
                raw_frame: raw_text,
                lote_afectado_id: loteAfectadoId,
                ml_descontados: mlDescontados,
                fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                procesado: true
            }
        });

        res.status(200).json({ 
            success: true, 
            message: logMessage, 
            data: {
                logId: newLog.id,
                tipo_prueba: isQcAuto ? 'QC' : (isCalAuto ? 'CALIB' : (isRepAuto ? 'REPETICION' : 'NORMAL')),
                descuento: descuentoExitoso,
                lote_id: loteAfectadoId,
                ml_descontados: mlDescontados
            }
        });

    } catch (error) {
        console.error('[Sniffer Webhook] Error:', error);
        res.status(500).json({ success: false, message: 'Error procesando la trama.', error: error.message });
    }
};

// Obtener los logs para mostrarlos en el Dashboard Frontend
exports.getSnifferLogs = async (req, res) => {
    try {
        const logs = await prisma.logSniffer.findMany({
            orderBy: {
                fecha_registro: 'desc'
            },
            take: 100 // Solo traer los últimos 100 para el dashboard en vivo
        });

        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        console.error('[Sniffer Get Logs] Error:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo los logs.' });
    }
};
