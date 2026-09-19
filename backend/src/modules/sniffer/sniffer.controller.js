const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Diccionario clínico y de analizadores para traducción automática de acrónimos (Wiener CM 260i & Mindray BS-230)
const ANALYZER_ALIASES = {
    'UREL': ['UREA', 'BUN', 'NITROGENO'],
    'URIL': ['ACIDO URICO', 'URIC ACID'],
    'CRELC': ['CREATININA', 'CREATININE'],
    'CREA': ['CREATININA', 'CREATININE'],
    'CREAL': ['CREATININA', 'CREATININE'],
    'GOTL': ['GOT', 'AST', 'ASPARTATE AMINOTRANSFERASE'],
    'GPTL': ['GPT', 'ALT', 'ALANINE AMINOTRANSFERASE'],
    'GGTL': ['GGT', 'GAMMA-GLUTAMYLTRANSFERASE'],
    'LDHL': ['LDH', 'LACTATO DESHIDROGENASA', 'LACTATE DEHYDROGENASE'],
    'ALPL': ['ALP', 'FOSFATASA ALCALINA', 'ALKALINE PHOSPHATASE'],
    'AMIL': ['AMYLASE', 'AMILASA'],
    'LIP': ['LIPASA', 'LIPASE'],
    'BTL': ['BILIRRUBINA TOTAL', 'BILIRUBIN TOTAL'],
    'BDL': ['BILIRRUBINA DIRECTA', 'BILIRUBIN DIRECT'],
    'CAAIII': ['CALCIO', 'CALCIUM'],
    'FOSFW': ['FOSFORO', 'PHOSPHORUS'],
    'MAGNESIO': ['MAGNESIO', 'MAGNESIUM'],
    'FELW': ['HIERRO', 'FERREMIA', 'IRON'],
    'UIBC-WI': ['UIBC'],
    'ALB': ['ALBUMINA', 'ALBUMIN'],
    'TP': ['PROTEINAS TOTALES', 'TOTAL PROTEIN'],
    'GLICEMIA': ['GLICEMIA', 'GLUCOSA', 'GLUCOSE'],
    'GLU': ['GLICEMIA', 'GLUCOSA', 'GLUCOSE'],
    'GLUL': ['GLICEMIA', 'GLUCOSA', 'GLUCOSE'],
    'GLUCOSA': ['GLICEMIA', 'GLUCOSA', 'GLUCOSE'],
    'GLUCOSE': ['GLICEMIA', 'GLUCOSA', 'GLUCOSE'],
    '13': ['GLICEMIA', 'GLUCOSA', 'GLUCOSE'],
    '38': ['HEMOGLOBINA', 'HEMOGLOBINA A1C', 'HBA1C'],
    '39': ['HEMOGLOBINA', 'HEMOGLOBINA A1C', 'HBA1C'],
    '42': ['HEMOGLOBINA', 'HEMOGLOBINA A1C', 'HBA1C'],
    'HEMOGLOBIN': ['HEMOGLOBINA', 'HEMOGLOBINA A1C', 'HBA1C'],
    'HEMOGLOBINA A1C': ['HEMOGLOBINA', 'HEMOGLOBINA A1C', 'HBA1C'],
    'COLESTEROL': ['COLESTEROL', 'CHOLESTEROL', 'TOTAL CHOLESTEROL', 'COL', 'CHOL', 'COLL'],
    'COL': ['COLESTEROL', 'CHOLESTEROL'],
    'COLL': ['COLESTEROL', 'CHOLESTEROL'],
    'CHOL': ['COLESTEROL', 'CHOLESTEROL'],
    'TRIGLICERIDOS': ['TRIGLICERIDOS', 'TRIGLYCERIDES'],
    'TRIG': ['TRIGLICERIDOS', 'TRIGLYCERIDES'],
    'HDL': ['HDL', 'HDL-CHOLESTEROL'],
    'LDL': ['LDL', 'LDL-CHOLESTEROL']
};

function matchToken(term, pat) {
    if (term === pat) return true;
    // Evitar que siglas cortas de 3 letras (como LIP) hagan match por prefijo con palabras no relacionadas (como LIPIDOS)
    if (term.length >= 4 && pat.length >= 4 && (term.startsWith(pat) || pat.startsWith(term))) return true;
    if (pat.length >= 5 && term.length >= 5 && (term.includes(pat) || pat.includes(term))) return true;
    const wordRegex = new RegExp('(?:^|[^A-Za-z0-9])' + pat.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?:$|[^A-Za-z0-9])', 'i');
    return wordRegex.test(term);
}


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

        let dev_name = equipo_origen || 'UNKNOWN_DEVICE';
        // Normalización automática de equipos según IPs del laboratorio (.env)
        if (dev_name === '192.168.10.188' || dev_name.includes('192.168.10.188') || dev_name.toLowerCase().includes('wiener') || dev_name.toLowerCase().includes('cm')) {
            dev_name = 'CM 260i';
        } else if (dev_name === '192.168.30.148' || dev_name.includes('192.168.30.148') || dev_name.toLowerCase().includes('mindray') || dev_name.toLowerCase().includes('bs 230') || dev_name.toLowerCase().includes('bs-230')) {
            dev_name = 'Mindray BS 230';
        } else if (dev_name === '192.168.30.211' || dev_name.includes('192.168.30.211') || dev_name.toLowerCase().includes('clia') || dev_name.toLowerCase().includes('900i')) {
            dev_name = 'CLIA 900i';
        }

        const raw_text = raw_frame || '';
        const isAck = raw_text.includes('ACK^R01') || raw_text.includes('MSA|AA');
        const isQry = raw_text.includes('QRY^Q02');

        let resolvedTestName = test_name;
        let resolvedPatientId = patient_id || 'UNKNOWN';

        if (isAck) {
            resolvedTestName = 'HANDSHAKE_ACK';
        } else if (isQry) {
            resolvedTestName = 'CONSULTA WORKLIST';
            // Extraer ID de muestra de QRD si existe (ej. QRD|...|80^RD|090903001|...)
            const qrdMatch = raw_text.match(/QRD\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|([^|^|\r\n]+)/);
            if (qrdMatch && qrdMatch[1]) {
                resolvedPatientId = qrdMatch[1].trim();
            }
        } else if (!resolvedTestName || resolvedTestName === 'RAW_TEST' || resolvedTestName === 'TEST_DESCONOCIDO' || resolvedTestName === 'RAW_TEST_HL7') {
            // Verificar si en el OBX viene tanto código numérico como descripción clínica
            // Ej: OBX|1|NM|13|Glucose (GOD-POD Method)|... o OBX|1|NM|38|Hemoglobin|...
            const obxFullMatch = raw_text.match(/OBX\|\d+\|[A-Za-z0-9]+\|([^|^|\r\n]*)\|([^|^|\r\n]*)/);
            if (obxFullMatch) {
                const obxCode = (obxFullMatch[1] || '').trim();
                const obxDesc = (obxFullMatch[2] || '').trim();

                // Si viene nombre descriptivo en field 4, priorizarlo o traducirlo
                if (obxDesc) {
                    const descLower = obxDesc.toLowerCase();
                    if (descLower.includes('glucose') || descLower.includes('glicemia') || descLower.includes('glucosa')) {
                        resolvedTestName = 'GLUCOSA';
                    } else if (descLower.includes('hemoglobin') || descLower.includes('hba1c') || descLower.includes('a1c')) {
                        resolvedTestName = 'HEMOGLOBINA A1C';
                    } else {
                        resolvedTestName = obxDesc.toUpperCase();
                    }
                } else if (obxCode) {
                    if (obxCode === '13') resolvedTestName = 'GLUCOSA';
                    else if (obxCode === '38' || obxCode === '39' || obxCode === '42') resolvedTestName = 'HEMOGLOBINA A1C';
                    else resolvedTestName = obxCode;
                }
            }

            // Fallback si sigue desconocido o numérico
            if (!resolvedTestName || resolvedTestName === 'TEST_DESCONOCIDO' || resolvedTestName === 'RAW_FRAME' || /^\d+$/.test(resolvedTestName)) {
                if (resolvedTestName === '13') {
                    resolvedTestName = 'GLUCOSA';
                } else if (resolvedTestName === '38' || resolvedTestName === '39' || resolvedTestName === '42') {
                    resolvedTestName = 'HEMOGLOBINA A1C';
                } else {
                    const dspMatch = raw_text.match(/DSP\|29\|\|([^|^|\r\n]+)/);
                    if (dspMatch && dspMatch[1]) {
                        resolvedTestName = dspMatch[1].trim();
                    } else {
                        const rMatch = raw_text.match(/R\|\d+\|\^{0,3}([^|^|\r\n]+)/);
                        if (rMatch && rMatch[1]) {
                            resolvedTestName = rMatch[1].trim();
                        }
                    }
                }
            }
        }

        // Extraer ID de muestra o paciente si viene genérico o si coincide con el nombre de la prueba
        const isGenericOrTestName = !resolvedPatientId || 
            resolvedPatientId === 'PAC-AUTO' || 
            resolvedPatientId === 'UNKNOWN' ||
            resolvedPatientId.toLowerCase() === (resolvedTestName || '').toLowerCase() ||
            resolvedPatientId.toLowerCase() === 'calcium' ||
            resolvedPatientId.toLowerCase() === 'calcio';

        if (isGenericOrTestName) {
            const obrMatch = raw_text.match(/OBR\|[^|]*\|([A-Za-z0-9_\- ]+)/);
            if (obrMatch && obrMatch[1]) {
                resolvedPatientId = obrMatch[1].trim();
            } else {
                const dspPid = raw_text.match(/DSP\|21\|\|([A-Za-z0-9_\- ]+)/);
                if (dspPid && dspPid[1]) {
                    resolvedPatientId = dspPid[1].trim();
                }
            }
        }

        if (!resolvedTestName && !isAck) {
            resolvedTestName = isQry ? 'CONSULTA WORKLIST' : 'TEST_DESCONOCIDO';
        }

        const pid_lower = resolvedPatientId.toLowerCase();

        // 1. Auto-detección de tipo de corrida (excluyendo analitos como Calcio/Calcium de ser clasificados como calibrador)
        const isQcAuto = is_qc || pid_lower.startsWith('qc') || pid_lower.startsWith('ctrl') || pid_lower.includes('control');
        const isCalAuto = is_calibracion || 
            (pid_lower.startsWith('cal') && !pid_lower.startsWith('calci') && !pid_lower.startsWith('calc')) || 
            pid_lower.startsWith('std') || 
            pid_lower.includes('standard') || 
            pid_lower.includes('calib') ||
            pid_lower.includes('calibrad');
        
        let isRepAuto = is_repeticion || false;

        // Auto-detectar repeticiones: si se corrió la misma prueba para el mismo paciente durante el día de hoy
        if (!isAck && !isRepAuto && !isQcAuto && !isCalAuto && resolvedTestName !== 'TEST_DESCONOCIDO' && resolvedPatientId !== 'UNKNOWN' && !resolvedPatientId.startsWith('PAC-AUTO')) {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const prevLog = await prisma.logSniffer.findFirst({
                where: {
                    patient_id: resolvedPatientId,
                    test_name: resolvedTestName,
                    fecha_registro: { gte: startOfToday }
                },
                orderBy: { id: 'desc' }
            });
            if (prevLog) {
                isRepAuto = true;
            }
        }
        let loteAfectadoId = null;
        let mlDescontados = 0;
        let logMessage = "Log registrado exitosamente.";
        let descuentoExitoso = false;
        let newLog = null;

        // 2. Mapeo Flexible: código del equipo → reactivo del inventario
        const test_id_equipo = req.body.test_id_equipo || null;
        let mapeo = null;

        if (isAck) {
            // Handshake ACK no requiere búsqueda de reactivo
            mapeo = null;
        } else if (resolvedTestName && resolvedTestName !== 'TEST_DESCONOCIDO') {
            const cleanTest = resolvedTestName.split('^')[0].trim().toUpperCase();

            // A. Código específico de equipo si viene en el payload
            if (test_id_equipo) {
                mapeo = await prisma.mapeo_pruebas_reactivos.findFirst({
                    where: { codigo_equipo: String(test_id_equipo), activo: true }
                });
            }

            // B. Coincidencia inteligente en mapeo_pruebas_reactivos
            if (!mapeo) {
                const todosMapeos = await prisma.mapeo_pruebas_reactivos.findMany({
                    where: { activo: true }
                });

                const aliasTerms = [cleanTest, ...(ANALYZER_ALIASES[cleanTest] || [])];

                for (const m of todosMapeos) {
                    const nombreUpper = (m.nombre_prueba || '').trim().toUpperCase();
                    const patronTokens = (m.patron_busqueda || '').split('|').map(p => p.trim().toUpperCase()).filter(Boolean);
                    const allPatterns = [nombreUpper, ...patronTokens];

                    const matches = aliasTerms.some(term => 
                        allPatterns.some(pat => matchToken(term, pat))
                    );

                    if (matches) {
                        mapeo = m;
                        break;
                    }
                }
            }

            // C. Fallback: buscar directamente en el catálogo de items_inventario
            if (!mapeo) {
                const aliasTerms = [cleanTest, ...(ANALYZER_ALIASES[cleanTest] || [])];
                for (const term of aliasTerms) {
                    const itemDirecto = await prisma.itemInventario.findFirst({
                        where: {
                            activo: true,
                            OR: [
                                { nombre: { contains: term } },
                                { codigo: { contains: term } }
                            ]
                        },
                        select: { id: true, nombre: true, consumo_indicado: true }
                    });
                    if (itemDirecto) {
                        mapeo = { 
                            reactivo_id: itemDirecto.id, 
                            consumo_por_prueba: itemDirecto.consumo_indicado || 1 
                        };
                        break;
                    }
                }
            }
        }

        if (mapeo) {
            // Multiplicar consumo si es QC o Calibración (suelen consumir el doble o triple)
            let mlAConsumir = Number(mapeo.consumo_por_prueba) || 0;
            
            // 1. Buscar lote abierto en uso específicamente para este equipo (CM 260i o Mindray BS-230)
            let loteActivo = await prisma.lotesReactivos.findFirst({
                where: {
                    InventarioId: mapeo.reactivo_id,
                    Estado: 'Activo',
                    FechaApertura: { not: null },
                    CantidadActual: { gt: 0 },
                    CondicionesEspeciales: { contains: dev_name }
                },
                orderBy: { FechaVencimiento: 'asc' }
            });

            // 2. Si no hay lote específico por equipo, buscar cualquier lote abierto por el bioanalista (FEFO)
            if (!loteActivo) {
                loteActivo = await prisma.lotesReactivos.findFirst({
                    where: {
                        InventarioId: mapeo.reactivo_id,
                        Estado: 'Activo',
                        FechaApertura: { not: null },
                        CantidadActual: { gt: 0 }
                    },
                    orderBy: { FechaVencimiento: 'asc' }
                });
            }

            if (loteActivo && mlAConsumir > 0) {
                loteAfectadoId = loteActivo.Id;
                mlDescontados = mlAConsumir;

                const itemInv = await prisma.itemInventario.findUnique({
                    where: { id: mapeo.reactivo_id },
                    select: { frascos_por_caja: true, volumen_por_frasco: true }
                });

                const volFrasco = Number(itemInv?.volumen_por_frasco) || 50;
                const frascosCaja = Number(itemInv?.frascos_por_caja) || 4;
                const tipoCorrida = isCalAuto ? 'CALIBRACION' : isQcAuto ? 'QC' : isRepAuto ? 'REPETICION' : 'NORMAL';

                // Transacción atómica ACID (Lote Decrement + Kárdex + Sniffer Log)
                const txResult = await prisma.$transaction(async (tx) => {
                    // A. Decremento atómico nativo en SQL Server (evita Race Condition)
                    const updatedLote = await tx.lotesReactivos.update({
                        where: { Id: loteActivo.Id },
                        data: { CantidadActual: { decrement: mlAConsumir } }
                    });

                    const restMl = Math.max(0, Number(updatedLote.CantidadActual));
                    if (restMl <= 0 && updatedLote.Estado !== 'Agotado') {
                        await tx.lotesReactivos.update({
                            where: { Id: loteActivo.Id },
                            data: { Estado: 'Agotado' }
                        });
                    }

                    // Auto-transición de frascos automática (Frasco 1 -> Frasco 2...)
                    let meta = {};
                    try {
                        if (loteActivo.CondicionesEspeciales) {
                            meta = JSON.parse(loteActivo.CondicionesEspeciales);
                        }
                    } catch (_) {}

                    const totalFrascos = Number(meta.total_frascos || frascosCaja) || 4;
                    const volPorFrasco = Number(meta.vol_por_frasco || volFrasco) || 45;
                    const totalVolCaja = Number(meta.volumen_total_caja || (totalFrascos * volPorFrasco));
                    const mlConsumidosTotal = Math.max(0, totalVolCaja - restMl);
                    const frascoCalculado = Math.min(totalFrascos, Math.floor(mlConsumidosTotal / volPorFrasco) + 1);

                    if (frascoCalculado > (meta.frasco_actual || 1) && frascoCalculado <= totalFrascos) {
                        meta.frasco_actual = frascoCalculado;
                        meta[`fecha_apertura_frasco_${frascoCalculado}`] = new Date().toISOString();
                        await tx.lotesReactivos.update({
                            where: { Id: loteActivo.Id },
                            data: { CondicionesEspeciales: JSON.stringify(meta) }
                        });
                        console.log(`🔄 [Auto-Transición Sniffer] Lote ${loteActivo.NumeroLote}: Frasco ${frascoCalculado} montado y activado automáticamente.`);
                    }

                    const frascosRestantes = (restMl / volFrasco).toFixed(1);
                    const cajasRestantes = (restMl / (volFrasco * frascosCaja)).toFixed(2);

                    // B. Asiento en Kárdex
                    await tx.movimientoInventario.create({
                        data: {
                            item_id:         mapeo.reactivo_id,
                            tipo_movimiento: 'CONSUMO',
                            cantidad:        mlAConsumir,
                            stock_anterior:  Number(loteActivo.CantidadActual),
                            stock_nuevo:     restMl,
                            motivo:    `Consumo Sniffer (${tipoCorrida}) - ${dev_name}`,
                            referencia: `Lote: ${loteActivo.NumeroLote} (${frascosRestantes} frascos / ${cajasRestantes} cajas rest.)`,
                            creado_por:      1
                        }
                    });

                    // C. Log de sniffer
                    const createdLog = await tx.logSniffer.create({
                        data: {
                            test_name: resolvedTestName,
                            patient_id: resolvedPatientId,
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

                    return { createdLog, frascosRestantes, cajasRestantes };
                });

                newLog = txResult.createdLog;
                descuentoExitoso = true;
                logMessage = `✅ Descontados ${mlAConsumir}ml del lote ${loteActivo.NumeroLote} [${tipoCorrida}]. Restan ${txResult.frascosRestantes} frascos (${txResult.cajasRestantes} Cajas).`;
            } else {
                logMessage = `⚠️ Sin lote activo con stock para el reactivo ID ${mapeo.reactivo_id}.`;
            }
        } else {
            logMessage = `📋 Prueba "${test_name}" (${test_id_equipo || 'sin código'}) sin mapeo configurado. Agregala en la pantalla de Mapeo de Pruebas.`;
        }

        // Si no hubo descuento por transacción, registrar el log normalmente
        if (!newLog) {
            newLog = await prisma.logSniffer.create({
                data: {
                    test_name: resolvedTestName,
                    patient_id: resolvedPatientId,
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
        }

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
            take: 250 // Aumentado a 250 para asegurar visibilidad de todas las pruebas sin ser desplazadas por ACKs
        });

        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        console.error('[Sniffer Get Logs] Error:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo los logs.' });
    }
};
