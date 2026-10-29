const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Función auxiliar para obtener mapeos con su reactivo asociado sin error de include en Prisma
async function getMapeosConItems() {
    const [mapeos, items] = await Promise.all([
        prisma.mapeo_pruebas_reactivos.findMany({ where: { activo: true } }),
        prisma.itemInventario.findMany()
    ]);
    const itemsMap = new Map(items.map(it => [it.id, it]));
    return mapeos.map(m => ({
        ...m,
        items_inventario: itemsMap.get(m.reactivo_id) || null
    }));
}


// Diccionario clínico y de analizadores para traducción automática de acrónimos
const ANALYZER_ALIASES = {
    // Mindray BS-230 Canales numéricos y Aliases de Pruebas
    '40': ['CRP II', 'CRP', 'C-REACTIVE PROTEIN', 'PCR', 'PROTEINA C REACTIVA'],
    'CRP II': ['CRP II', 'CRP', 'C-REACTIVE PROTEIN', 'PCR', 'PROTEINA C REACTIVA'],
    'C-REACTIVE PROTEIN': ['CRP II', 'CRP', 'C-REACTIVE PROTEIN', 'PCR', 'PROTEINA C REACTIVA'],
    '15': ['T-BIL-V', 'BILIRRUBINA TOTAL', 'BILIRUBIN TOTAL', 'BIL-T-V', 'T-BIL'],
    '16': ['D-BIL-V', 'BILIRRUBINA DIRECTA', 'BILIRUBIN DIRECT', 'BIL-D-V', 'D-BIL'],
    '17': ['ALT', 'GPT', 'ALANINE AMINOTRANSFERASE'],
    '18': ['AST', 'GOT', 'ASPARTATE AMINOTRANSFERASE'],
    '24': ['TG', 'TRIGLICERIDOS', 'TRIGLYCERIDES'],
    '25': ['TC', 'COLESTEROL TOTAL', 'TOTAL CHOLESTEROL', 'CHOL'],
    '27': ['CREA-S', 'CREATININA', 'CREATININE', 'CREATININE (SARCOSINE OXIDASE METHOD)'],
    '28': ['UA', 'ACIDO URICO', 'URIC ACID'],
    '29': ['UREA', 'BUN'],
    '37': ['RF II', 'RF', 'FACTOR REUMATOIDEO', 'RHEUMATOID FACTOR'],
    '46': ['ASO', 'ASTO', 'ANTIESTREPTOLISINA'],
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
    'AMIL': ['AMYLASE', 'AMILASA', 'A-AMY', 'AMY'],
    'LIP': ['LIPASA', 'LIPASE'],
    'LIPWI': ['LIPASA', 'LIPASE', 'LIP', 'LIPASA AA LIQUIDA', 'LIP-WI'],
    'LIP-WI': ['LIPASA', 'LIPASE', 'LIP', 'LIPASA AA LIQUIDA'],
    'BTL': ['BILIRRUBINA TOTAL', 'BILIRUBIN TOTAL'],
    'BDL': ['BILIRRUBINA DIRECTA', 'BILIRUBIN DIRECT'],
    'CAAIII': ['CALCIO', 'CALCIUM'],
    'FOSFW': ['FOSFATEMIA', 'FOSFATEMIA UV', 'FOSFATEMIA UV  AA', 'FOSFORO', 'PHOSPHORUS', 'FOS'],
    'FOSFw': ['FOSFATEMIA', 'FOSFATEMIA UV', 'FOSFATEMIA UV  AA', 'FOSFORO', 'PHOSPHORUS', 'FOS'],
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
    'HDL': ['HDL', 'HDLC', 'HDL-CHOLESTEROL', 'HDL CHOLESTEROL', 'HDL COLESTEROL DIRECT', 'HDL COLESTEROL DIRECT 40 ML'],
    'HDLC': ['HDL', 'HDLC', 'HDL-CHOLESTEROL', 'HDL CHOLESTEROL', 'HDL COLESTEROL DIRECT', 'HDL COLESTEROL DIRECT 40 ML'],
    'FOS': ['FOS', 'FOSFW', 'FOSFORO', 'PHOSPHORUS', 'FOSFATEMIA', 'FOSFATEMIA UV'],
    'LDL': ['LDL', 'LDL-CHOLESTEROL'],
    // Mindray BS-230 Aliases
    'P II': ['P II', 'P-II', 'FOSFORO', 'PHOSPHORUS', 'P', 'FOS'],
    'GLU-H': ['GLU-H', 'GLU-HK', 'GLUCOSA HK', 'GLICEMIA HK', 'GLUCOSA', 'GLICEMIA'],
    'GLU-G': ['GLU-G', 'GLU-GOD', 'GLUCOSA GOD', 'GLICEMIA GOD', 'GLUCOSA', 'GLICEMIA'],
    'T-BIL-V': ['T-BIL-V', 'BIL-T-V', 'BILIRRUBINA TOTAL VOX', 'BILIRRUBINA TOTAL', 'BIL-T', 'BTL'],
    'D-BIL-V': ['D-BIL-V', 'BIL-D-V', 'BILIRRUBINA DIRECTA VOX', 'BILIRRUBINA DIRECTA', 'BIL-D', 'BDL'],
    'Y-GT': ['Y-GT', 'GGT', 'GAMMA GT', 'GAMMA-GLUTAMYLTRANSFERASE', 'GGTL'],
    'TP II': ['TP II', 'TP-II', 'PROTEINAS TOTALES II', 'TOTAL PROTEIN', 'TP', 'PT'],
    'A-AMY': ['A-AMY', 'AMIL', 'AMYLASE', 'AMILASA', 'AMY'],
    'TC': ['TC', 'COLESTEROL TOTAL', 'TOTAL CHOLESTEROL', 'COLESTEROL', 'CHOL', 'COL', 'COLL'],
    'CREA-S': ['CREA-S', 'CREATININA', 'CREATININE', 'CREA', 'CRELC'],
    'UA': ['UA', 'ACIDO URICO', 'URIC ACID', 'URIL'],
    'DOIMERO D': ['DOIMERO D', 'DIMERO D', 'D-DIMER', 'DDIM'],
    'RF II': ['RF II', 'RF-II', 'FACTOR REUMATOIDEO', 'RF'],
    'HB-2': ['HB-2', 'HB2', 'HEMOGLOBINA', 'HB'],
    'HBAC-2': ['HBAC-2', 'HBAC2', 'HBA1C', 'HEMOGLOBINA A1C'],
    'CRP II': ['CRP II', 'CRP-II', 'PCR', 'PROTEINA C REACTIVA', 'CRP', 'PCRW'],
    'TG-KR': ['TG-KR', 'TG KR', 'TRIGLICERIDOS KR', 'TG', 'TRIGLICERIDOS'],
    'GLUC KR': ['GLUC KR', 'GLUC-KR', 'GLUCOSA KR', 'GLICEMIA KR', 'GLUCOSA'],
    'COLEST CRO': ['COLEST CRO', 'COLEST-CRO', 'COLESTEROL CRO', 'COLESTEROL'],
    'PCRCR': ['PCRCR', 'PCR-CR', 'PROTEINA C REACTIVA CR', 'PCR'],
    'CREAT W': ['CREAT W', 'CREAT-W', 'CREATININA WIENER', 'CREATININA', 'CREA'],
    'PTUL': ['PTUL', 'TPUC', 'PROTEINAS TOTALES ORINA', 'PROTI U', 'PROTI'],
    'CK W': ['CK W', 'CK-W', 'CREATINE KINASE WIENER', 'CK', 'CPK'],
    // Mindray CL-900i (CLIA / Inmunodiagnóstico)
    'FT3': ['FT3', 'FREE T3', 'FREE TRIIODOTHYRONINE', 'FREE TRILODOTHYRONINE'],
    'FT4': ['FT4', 'FREE T4', 'FREE THYROXINE'],
    'T3': ['T3', 'TOTAL T3', 'TRIIODOTHYRONINE', 'TRILOTHYRONINE'],
    'T4': ['T4', 'TOTAL T4', 'THYROXINE'],
    'TSH': ['TSH', 'TIROTROPINA', 'THYROID STIMULATING HORMONE'],
    'TG': ['TG', 'TIROGLOBULINA', 'THYROGLOBULIN'],
    'ANTI-TG': ['ANTI-TG', 'ANTITG', 'ATG', 'ANTI TG'],
    'ANTI-TPO': ['ANTI-TPO', 'ANTITPO', 'TPO', 'ANTI TPO'],
    'CA125': ['CA125', 'CA-125', 'CA 125'],
    'CA15-3': ['CA15-3', 'CA-15-3', 'CA 15-3', 'CA153'],
    'CA19-9': ['CA19-9', 'CA-19-9', 'CA 19-9', 'CA199'],
    'TPSA': ['TPSA', 'TOTAL PSA', 'PSA TOTAL', 'PSA', 'T-PSA'],
    'T-PSA': ['T-PSA', 'TPSA', 'TOTAL PSA', 'PSA TOTAL', 'PSA'],
    'FPSA': ['FPSA', 'FREE PSA', 'PSA LIBRE'],
    'CEA': ['CEA', 'CARCINOEMBRYONIC'],
    'AFP': ['AFP', 'ALFAFETOPROTEINA', 'ALPHA-FETOPROTEIN'],
    'PG II': ['PG II', 'PGII', 'PEPSINOGEN II', 'PEPSINOGENO II'],
    'FSH': ['FSH', 'FOLLICLE', 'FOLICULOESTIMULANTE'],
    'LH': ['LH', 'LUTEINIZING', 'LUTEINIZANTE'],
    'PROG': ['PROG', 'PROGESTERONE', 'PROGESTERONA'],
    'PRL': ['PRL', 'PROLACTIN', 'PROLACTINA'],
    'TESTO': ['TESTO', 'TESTOSTERONE', 'TESTOSTERONA'],
    'E2': ['E2', 'ESTRADIOL'],
    'HCG': ['HCG', 'B-HCG', 'BHCG', 'BETA HCG', 'HUMAN CHORIONIC GONADOTROPIN'],
    'INSULIN': ['INSULIN', 'INSULINA', 'INS'],
    'C-PEPTIDE': ['C-PEPTIDE', 'PEPTIDO C', 'PEPTIDO-C'],
    'DHEA-S': ['DHEA-S', 'DHEAS', 'DHEA'],
    'MYO': ['MYO', 'MIOGLOBINA', 'MYOGLOBIN'],
    'PTH': ['PTH', 'PARATHYROID', 'PARATOHORMONA'],
    'RBC-FOLATE': ['RBC-FOLATE', 'RBC FOLATE', 'FOLATO ERITROCITARIO', 'RBCFOLATE'],
    'ANTI-HBC': ['ANTI-HBC', 'ANTI-HBC (CE)', 'ANTIHBC'],
    'ANTI-HCV': ['ANTI-HCV', 'ANTI-HCV (NON-CE)', 'ANTIHCV'],
    'ANTI-TP': ['ANTI-TP', 'ANTITP', 'ANTI TP', 'SYPHILIS', 'SIFILIS', 'TREPONEMA'],
    'HBSAG': ['HBSAG', 'HBSAG (CE)', 'HEPATITIS B SURFACE ANTIGEN'],
    'HIV': ['HIV', 'HIV (CE)', 'VIH'],
    'FERR': ['FERR', 'FERRITIN', 'FERRITINA']
};

function matchToken(term, pat) {
    if (term === pat) return true;
    const isTermHdlOrLdl = term.startsWith('HDL') || term.startsWith('LDL');
    const isPatHdlOrLdl = pat.startsWith('HDL') || pat.startsWith('LDL');
    if (isTermHdlOrLdl !== isPatHdlOrLdl) return false;

    if (term.length >= 4 && pat.length >= 4 && (term.startsWith(pat) || pat.startsWith(term))) return true;
    if (pat.length >= 5 && term.length >= 5 && (term.includes(pat) || pat.includes(term))) return true;
    const escaped = pat.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const wordRegex = new RegExp('(?:^|[^A-Za-z0-9])' + escaped + '(?:$|[^A-Za-z0-9])', 'i');
    return wordRegex.test(term);
}

// Cache en memoria para idempotencia y anti-duplicados (evita dobles descuentos por red/loopback)
const recentMessagesCache = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [key, time] of recentMessagesCache.entries()) {
        if (now - time > 30000) {
            recentMessagesCache.delete(key);
        }
    }
}, 60000);

// =========================================================================
// HANDLER: WIENER CM 260i
// =========================================================================
async function processCM260i({ raw_frame, test_name, patient_id, is_qc, is_calibracion, is_repeticion, timestamp, isAck, isQry }) {
    const dev_name = 'CM 260i';
    let resolvedTestName = test_name;
    let resolvedPatientId = patient_id || 'UNKNOWN';

    // Extracción de prueba desde OBX si viene genérico
    if (!resolvedTestName || resolvedTestName === 'RAW_TEST' || resolvedTestName === 'TEST_DESCONOCIDO' || resolvedTestName === 'RAW_TEST_HL7') {
        const obxMatch = raw_frame.match(/OBX\|\d+\|[A-Za-z0-9]+\|([^|^|\r\n]*)/);
        if (obxMatch && obxMatch[1]) {
            resolvedTestName = obxMatch[1].trim();
        } else {
            const dspMatch = raw_frame.match(/DSP\|29\|\|([^|^|\r\n]+)/);
            if (dspMatch && dspMatch[1]) resolvedTestName = dspMatch[1].trim();
        }
    }

    // Extracción de paciente / control desde OBR si viene genérico
    const isGenericPid = !resolvedPatientId || resolvedPatientId === 'UNKNOWN' || resolvedPatientId === 'PAC-AUTO' ||
        resolvedPatientId.toLowerCase() === (resolvedTestName || '').toLowerCase();
    if (isGenericPid) {
        const obrMatch = raw_frame.match(/OBR\|[^|]*\|([A-Za-z0-9_\- ]+)/);
        if (obrMatch && obrMatch[1]) {
            resolvedPatientId = obrMatch[1].trim();
        } else {
            const dspPid = raw_frame.match(/DSP\|21\|\|([A-Za-z0-9_\- ]+)/);
            if (dspPid && dspPid[1]) resolvedPatientId = dspPid[1].trim();
        }
    }

    const pid_lower = resolvedPatientId.toLowerCase();
    const isQcAuto = is_qc || 
        pid_lower.startsWith('qc') || 
        pid_lower.startsWith('ctrl') || 
        pid_lower.includes('control') ||
        pid_lower.includes('standatrol') ||
        pid_lower.includes('standratol') ||
        pid_lower.includes('valitrol') ||
        pid_lower.includes('lyphochek');

    const isCalAuto = is_calibracion || 
        (pid_lower.startsWith('cal') && !pid_lower.startsWith('calci') && !pid_lower.startsWith('calc')) || 
        pid_lower.startsWith('std') || 
        pid_lower.includes('standard') || 
        pid_lower.includes('calib') ||
        pid_lower.includes('calibrad');

    let isRepAuto = is_repeticion || false;
    if (!isAck && !isRepAuto && !isQcAuto && !isCalAuto && resolvedTestName !== 'TEST_DESCONOCIDO' && resolvedPatientId !== 'UNKNOWN') {
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
        if (prevLog) isRepAuto = true;
    }

    if (isAck || isQry) {
        const newLog = await prisma.logSniffer.create({
            data: {
                test_name: isAck ? 'HANDSHAKE_ACK' : 'CONSULTA WORKLIST',
                patient_id: resolvedPatientId,
                is_qc: false,
                is_calibracion: false,
                is_repeticion: false,
                equipo_origen: dev_name,
                raw_frame,
                ml_descontados: 0,
                fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                procesado: true
            }
        });
        return { success: true, message: 'ACK/QRY registrado sin descuento.', data: { logId: newLog.id, descuento: false } };
    }

    // Mapeo de reactivo para CM 260i
    const cleanTest = resolvedTestName.split('^')[0].trim().toUpperCase();
    const aliasTerms = [cleanTest, ...(ANALYZER_ALIASES[cleanTest] || [])];

    const todosMapeos = await getMapeosConItems();

    let mapeo = null;
    // 1. Buscar coincidencia EXACTA en CM 260
    for (const m of todosMapeos) {
        const eq = (m.items_inventario?.equipo_asociado || '').toLowerCase();
        if (!eq.includes('260') && !eq.includes('cm')) continue;
        const nombreUpper = (m.nombre_prueba || '').trim().toUpperCase();
        const patronTokens = (m.patron_busqueda || '').split('|').map(p => p.trim().toUpperCase()).filter(Boolean);
        const allPatterns = [nombreUpper, ...patronTokens];
        if (aliasTerms.some(term => allPatterns.some(pat => term === pat))) {
            mapeo = m;
            break;
        }
    }
    // 2. Si no hubo coincidencia exacta, buscar por token en CM 260
    if (!mapeo) {
        for (const m of todosMapeos) {
            const eq = (m.items_inventario?.equipo_asociado || '').toLowerCase();
            if (!eq.includes('260') && !eq.includes('cm')) continue;
            const nombreUpper = (m.nombre_prueba || '').trim().toUpperCase();
            const patronTokens = (m.patron_busqueda || '').split('|').map(p => p.trim().toUpperCase()).filter(Boolean);
            const allPatterns = [nombreUpper, ...patronTokens];
            if (aliasTerms.some(term => allPatterns.some(pat => matchToken(term, pat)))) {
                mapeo = m;
                break;
            }
        }
    }
    // 2. Si no se encontró mapeo específico, buscar general
    if (!mapeo) {
        for (const m of todosMapeos) {
            const nombreUpper = (m.nombre_prueba || '').trim().toUpperCase();
            const patronTokens = (m.patron_busqueda || '').split('|').map(p => p.trim().toUpperCase()).filter(Boolean);
            const allPatterns = [nombreUpper, ...patronTokens];
            if (aliasTerms.some(term => allPatterns.some(pat => matchToken(term, pat)))) {
                mapeo = m;
                break;
            }
        }
    }

    if (!mapeo) {
        const newLog = await prisma.logSniffer.create({
            data: {
                test_name: resolvedTestName,
                patient_id: resolvedPatientId,
                is_qc: isQcAuto,
                is_calibracion: isCalAuto,
                is_repeticion: isRepAuto,
                equipo_origen: dev_name,
                raw_frame,
                ml_descontados: 0,
                fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                procesado: true
            }
        });
        return { success: true, message: `⚠️ Prueba "${resolvedTestName}" sin mapeo en CM 260i.`, data: { logId: newLog.id, descuento: false } };
    }

    // Buscar lote activo abierto en CM 260i
    let mlAConsumir = Number(mapeo.consumo_por_prueba) || 0.25;

    const txResult = await prisma.$transaction(async (tx) => {
        let loteActivo = await tx.lotesReactivos.findFirst({
            where: {
                InventarioId: mapeo.reactivo_id,
                Estado: 'Activo',
                FechaApertura: { not: null },
                items_inventario: { equipo_asociado: { contains: '260' } }
            },
            orderBy: [{ FechaApertura: 'desc' }, { Id: 'desc' }]
        });

        if (!loteActivo) {
            loteActivo = await tx.lotesReactivos.findFirst({
                where: {
                    InventarioId: mapeo.reactivo_id,
                    Estado: 'Activo',
                    FechaApertura: { not: null }
                },
                orderBy: [{ FechaApertura: 'desc' }, { Id: 'desc' }]
            });
        }

        if (!loteActivo) return null;

        const updatedLote = await tx.lotesReactivos.update({
            where: { Id: loteActivo.Id },
            data: { CantidadActual: { decrement: mlAConsumir } }
        });

        const restMl = Number(updatedLote.CantidadActual);
        const itemInv = await tx.itemInventario.findUnique({
            where: { id: mapeo.reactivo_id },
            select: { frascos_por_caja: true, volumen_por_frasco: true }
        });

        const volFrasco = Number(itemInv?.volumen_por_frasco) || 45;
        const frascosCaja = Number(itemInv?.frascos_por_caja) || 4;

        // Auto-transición de frascos
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
            console.log(`🔄 [Auto-Transición CM 260i] Lote ${loteActivo.NumeroLote}: Frasco ${frascoCalculado} activado.`);
        }

        const frascosRestantes = (restMl / volFrasco).toFixed(1);
        const cajasRestantes = (restMl / (volFrasco * frascosCaja)).toFixed(2);
        const tipoCorrida = isCalAuto ? 'CALIBRACION' : isQcAuto ? 'QC' : isRepAuto ? 'REPETICION' : 'NORMAL';

        await tx.movimientoInventario.create({
            data: {
                item_id: mapeo.reactivo_id,
                tipo_movimiento: 'CONSUMO',
                cantidad: mlAConsumir,
                stock_anterior: Number(loteActivo.CantidadActual),
                stock_nuevo: restMl,
                motivo: `Consumo Sniffer (${tipoCorrida}) - ${dev_name}`,
                referencia: `Lote: ${loteActivo.NumeroLote} (${frascosRestantes} frascos / ${cajasRestantes} cajas rest.)`,
                creado_por: 1
            }
        });

        const createdLog = await tx.logSniffer.create({
            data: {
                test_name: resolvedTestName,
                patient_id: resolvedPatientId,
                is_qc: isQcAuto,
                is_calibracion: isCalAuto,
                is_repeticion: isRepAuto,
                equipo_origen: dev_name,
                raw_frame,
                lote_afectado_id: loteActivo.Id,
                ml_descontados: mlAConsumir,
                fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                procesado: true
            }
        });

        return { createdLog, loteActivo, restMl, frascosRestantes, cajasRestantes, tipoCorrida };
    });

    if (txResult) {
        return {
            success: true,
            message: `✅ CM 260i: Descontados ${mlAConsumir}ml del lote ${txResult.loteActivo.NumeroLote} [${txResult.tipoCorrida}]. Restan ${txResult.frascosRestantes} frascos.`,
            data: {
                logId: txResult.createdLog.id,
                tipo_prueba: txResult.tipoCorrida,
                descuento: true,
                lote_id: txResult.loteActivo.Id,
                ml_descontados: mlAConsumir
            }
        };
    } else {
        const fallbackLog = await prisma.logSniffer.create({
            data: {
                test_name: resolvedTestName,
                patient_id: resolvedPatientId,
                is_qc: isQcAuto,
                is_calibracion: isCalAuto,
                is_repeticion: isRepAuto,
                equipo_origen: dev_name,
                raw_frame,
                ml_descontados: 0,
                fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                procesado: true
            }
        });
        return { success: true, message: `⚠️ CM 260i: Sin lote activo abierto para reactivo ID ${mapeo.reactivo_id}.`, data: { logId: fallbackLog.id, descuento: false } };
    }
}

// =========================================================================
// HANDLER: MINDRAY BS-230
// =========================================================================
async function processBS230({ raw_frame, test_name, patient_id, is_qc, is_calibracion, is_repeticion, timestamp, isAck, isQry }) {
    const dev_name = 'Mindray BS 230';
    let resolvedPatientId = patient_id || 'UNKNOWN';

    // Extracción de Patient ID desde OBR o PID
    const obrMatch = raw_frame.match(/OBR\|\d+\|([^|^|\r\n]+)/);
    if (obrMatch && obrMatch[1]) {
        const obrPid = obrMatch[1].trim();
        if (obrPid && (resolvedPatientId === 'UNKNOWN' || resolvedPatientId === 'PAC-AUTO' || !resolvedPatientId)) {
            resolvedPatientId = obrPid;
        }
    }

    if (resolvedPatientId === 'UNKNOWN' || !resolvedPatientId) {
        const pidMatch = raw_frame.match(/PID\|\d+\|([^|^|\r\n]*)\|([^|^|\r\n]*)/);
        if (pidMatch && (pidMatch[1] || pidMatch[2])) {
            resolvedPatientId = (pidMatch[2] || pidMatch[1]).trim() || 'UNKNOWN';
        }
    }

    const pid_lower = resolvedPatientId.toLowerCase();
    const isQcAuto = is_qc || 
        pid_lower.startsWith('qc') || 
        pid_lower.startsWith('ctrl') || 
        pid_lower.includes('control') ||
        pid_lower.includes('clinchem') ||
        pid_lower.includes('lyphochek') ||
        pid_lower.includes('valitrol');

    const isCalAuto = is_calibracion || 
        (pid_lower.startsWith('cal') && !pid_lower.startsWith('calci') && !pid_lower.startsWith('calc')) || 
        pid_lower.startsWith('std') || 
        pid_lower.includes('standard') || 
        pid_lower.includes('calib') ||
        pid_lower.includes('calibrad');

    if (isAck || isQry) {
        const newLog = await prisma.logSniffer.create({
            data: {
                test_name: isAck ? 'HANDSHAKE_ACK' : 'CONSULTA WORKLIST',
                patient_id: resolvedPatientId,
                is_qc: false,
                is_calibracion: false,
                is_repeticion: false,
                equipo_origen: dev_name,
                raw_frame,
                ml_descontados: 0,
                fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                procesado: true
            }
        });
        return { success: true, message: 'ACK/QRY BS-230 registrado sin descuento.', data: { logId: newLog.id, descuento: false } };
    }

    // Extracción de todas las líneas OBX del HL7 (Cada prueba viene en un segmento OBX en BS-230)
    const lines = raw_frame.split(/[\r\n]+/);
    const obxLines = lines.filter(l => l.trim().startsWith('OBX|'));

    const itemsToProcess = [];

    if (obxLines.length > 0) {
        for (const line of obxLines) {
            const parts = line.trim().split('|');
            const channel = (parts[3] || '').trim();
            let testDesc = (parts[4] || '').trim();
            if (testDesc.includes('^')) {
                testDesc = testDesc.split('^')[0].trim();
            }
            const testIdentifier = testDesc || channel || 'TEST_DESCONOCIDO';
            itemsToProcess.push({ channel, testDesc, testIdentifier, obxLine: line });
        }
    } else {
        let fallbackTest = test_name || 'TEST_DESCONOCIDO';
        itemsToProcess.push({ channel: '', testDesc: fallbackTest, testIdentifier: fallbackTest, obxLine: '' });
    }

    const todosMapeos = await getMapeosConItems();
    const results = [];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    for (const item of itemsToProcess) {
        const testNameUpper = item.testIdentifier.toUpperCase();
        const channelUpper = item.channel.toUpperCase();

        const aliasTerms = [
            testNameUpper,
            ...(ANALYZER_ALIASES[testNameUpper] || []),
            ...(channelUpper ? [channelUpper, ...(ANALYZER_ALIASES[channelUpper] || [])] : [])
        ];

        let isRepAuto = is_repeticion || false;
        if (!isRepAuto && !isQcAuto && !isCalAuto && testNameUpper !== 'TEST_DESCONOCIDO' && resolvedPatientId !== 'UNKNOWN') {
            const prevLog = await prisma.logSniffer.findFirst({
                where: {
                    patient_id: resolvedPatientId,
                    equipo_origen: dev_name,
                    OR: [
                        { test_name: testNameUpper },
                        { test_name: item.testIdentifier }
                    ],
                    fecha_registro: { gte: startOfToday }
                },
                orderBy: { id: 'desc' }
            });
            if (prevLog) isRepAuto = true;
        }

        // 1. Coincidencia EXACTA para BS-230
        let mapeo = null;
        for (const m of todosMapeos) {
            const eq = (m.items_inventario?.equipo_asociado || '').toLowerCase();
            if (!eq.includes('230') && !eq.includes('bs')) continue;
            const nombreUpper = (m.nombre_prueba || '').trim().toUpperCase();
            const patronTokens = (m.patron_busqueda || '').split('|').map(p => p.trim().toUpperCase()).filter(Boolean);
            const allPatterns = [nombreUpper, ...patronTokens];
            if (aliasTerms.some(term => allPatterns.some(pat => term === pat))) {
                mapeo = m;
                break;
            }
        }

        // 2. Coincidencia por token (fallback) para BS-230
        if (!mapeo) {
            for (const m of todosMapeos) {
                const eq = (m.items_inventario?.equipo_asociado || '').toLowerCase();
                if (!eq.includes('230') && !eq.includes('bs')) continue;
                const nombreUpper = (m.nombre_prueba || '').trim().toUpperCase();
                const patronTokens = (m.patron_busqueda || '').split('|').map(p => p.trim().toUpperCase()).filter(Boolean);
                const allPatterns = [nombreUpper, ...patronTokens];
                if (aliasTerms.some(term => allPatterns.some(pat => matchToken(term, pat)))) {
                    mapeo = m;
                    break;
                }
            }
        }

        // 3. Fallback general
        if (!mapeo) {
            for (const m of todosMapeos) {
                const nombreUpper = (m.nombre_prueba || '').trim().toUpperCase();
                const patronTokens = (m.patron_busqueda || '').split('|').map(p => p.trim().toUpperCase()).filter(Boolean);
                const allPatterns = [nombreUpper, ...patronTokens];
                if (aliasTerms.some(term => allPatterns.some(pat => term === pat))) {
                    mapeo = m;
                    break;
                }
            }
        }

        if (!mapeo) {
            const newLog = await prisma.logSniffer.create({
                data: {
                    test_name: item.testIdentifier,
                    patient_id: resolvedPatientId,
                    is_qc: isQcAuto,
                    is_calibracion: isCalAuto,
                    is_repeticion: isRepAuto,
                    equipo_origen: dev_name,
                    raw_frame,
                    ml_descontados: 0,
                    fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                    procesado: true
                }
            });
            results.push({ test: item.testIdentifier, descontado: false, logId: newLog.id, reason: 'Sin mapeo' });
            continue;
        }

        let mlAConsumir = Number(mapeo.consumo_por_prueba) || 0.25;

        const txResult = await prisma.$transaction(async (tx) => {
            let loteActivo = await tx.lotesReactivos.findFirst({
                where: {
                    InventarioId: mapeo.reactivo_id,
                    Estado: 'Activo',
                    FechaApertura: { not: null },
                    items_inventario: { equipo_asociado: { contains: '230' } }
                },
                orderBy: [{ FechaApertura: 'desc' }, { Id: 'desc' }]
            });

            if (!loteActivo) {
                loteActivo = await tx.lotesReactivos.findFirst({
                    where: {
                        InventarioId: mapeo.reactivo_id,
                        Estado: 'Activo',
                        FechaApertura: { not: null }
                    },
                    orderBy: [{ FechaApertura: 'desc' }, { Id: 'desc' }]
                });
            }

            if (!loteActivo) return null;

            const updatedLote = await tx.lotesReactivos.update({
                where: { Id: loteActivo.Id },
                data: { CantidadActual: { decrement: mlAConsumir } }
            });

            const restMl = Number(updatedLote.CantidadActual);
            const itemInv = await tx.itemInventario.findUnique({
                where: { id: mapeo.reactivo_id },
                select: { frascos_por_caja: true, volumen_por_frasco: true }
            });

            const volFrasco = Number(itemInv?.volumen_por_frasco) || 45;
            const frascosCaja = Number(itemInv?.frascos_por_caja) || 4;

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
                console.log(`🔄 [Auto-Transición BS-230] Lote ${loteActivo.NumeroLote}: Frasco ${frascoCalculado} activado.`);
            }

            const frascosRestantes = (restMl / volFrasco).toFixed(1);
            const cajasRestantes = (restMl / (volFrasco * frascosCaja)).toFixed(2);
            const tipoCorrida = isCalAuto ? 'CALIBRACION' : isQcAuto ? 'QC' : isRepAuto ? 'REPETICION' : 'NORMAL';

            await tx.movimientoInventario.create({
                data: {
                    item_id: mapeo.reactivo_id,
                    tipo_movimiento: 'CONSUMO',
                    cantidad: mlAConsumir,
                    stock_anterior: Number(loteActivo.CantidadActual),
                    stock_nuevo: restMl,
                    motivo: `Consumo Sniffer (${tipoCorrida}) - ${dev_name}`,
                    referencia: `Lote: ${loteActivo.NumeroLote} (${frascosRestantes} frascos / ${cajasRestantes} cajas rest.)`,
                    creado_por: 1
                }
            });

            const createdLog = await tx.logSniffer.create({
                data: {
                    test_name: item.testIdentifier,
                    patient_id: resolvedPatientId,
                    is_qc: isQcAuto,
                    is_calibracion: isCalAuto,
                    is_repeticion: isRepAuto,
                    equipo_origen: dev_name,
                    raw_frame,
                    lote_afectado_id: loteActivo.Id,
                    ml_descontados: mlAConsumir,
                    fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                    procesado: true
                }
            });

            return { createdLog, loteActivo, restMl, frascosRestantes, cajasRestantes, tipoCorrida, mlAConsumir };
        });

        if (txResult) {
            results.push({
                test: item.testIdentifier,
                descontado: true,
                ml_descontados: txResult.mlAConsumir,
                lote_id: txResult.loteActivo.Id,
                lote_numero: txResult.loteActivo.NumeroLote,
                logId: txResult.createdLog.id,
                tipo_prueba: txResult.tipoCorrida
            });
        } else {
            const fallbackLog = await prisma.logSniffer.create({
                data: {
                    test_name: item.testIdentifier,
                    patient_id: resolvedPatientId,
                    is_qc: isQcAuto,
                    is_calibracion: isCalAuto,
                    is_repeticion: isRepAuto,
                    equipo_origen: dev_name,
                    raw_frame,
                    ml_descontados: 0,
                    fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                    procesado: true
                }
            });
            results.push({ test: item.testIdentifier, descontado: false, logId: fallbackLog.id, reason: 'Sin lote activo abierto' });
        }
    }

    const descontadosCount = results.filter(r => r.descontado).length;
    return {
        success: true,
        message: `✅ BS-230: Procesadas ${results.length} prueba(s) para paciente ${resolvedPatientId}. (${descontadosCount} descontadas con éxito).`,
        data: {
            paciente: resolvedPatientId,
            pruebas: results,
            descuento: descontadosCount > 0,
            logId: results[0]?.logId
        }
    };
}

// =========================================================================
// HANDLER: MINDRAY CL-900i (QUIMIOLUMINISCENCIA MULTI-OBX)
// =========================================================================
async function processCL900i({ raw_frame, test_name, patient_id, is_qc, is_calibracion, is_repeticion, timestamp, isAck, isQry }) {
    const dev_name = 'CLIA 900i';
    let resolvedPatientId = patient_id || 'UNKNOWN';

    if (resolvedPatientId === 'UNKNOWN' || resolvedPatientId === 'PAC-AUTO' || !resolvedPatientId) {
        const obrPidMatch = raw_frame.match(/OBR\|\d+\|([^|^|\r\n]+)/);
        if (obrPidMatch && obrPidMatch[1]) {
            resolvedPatientId = obrPidMatch[1].trim();
        }
    }

    const pid_lower = resolvedPatientId.toLowerCase();
    const isQcAuto = is_qc || 
        pid_lower.startsWith('qc') || 
        pid_lower.startsWith('ctrl') || 
        pid_lower.includes('control') ||
        pid_lower.includes('lyphochek') ||
        pid_lower.includes('valitrol');

    const isCalAuto = is_calibracion || 
        pid_lower.startsWith('cal') || 
        pid_lower.startsWith('std') || 
        pid_lower.includes('standard') || 
        pid_lower.includes('calib');

    if (isAck || isQry) {
        const newLog = await prisma.logSniffer.create({
            data: {
                test_name: isAck ? 'HANDSHAKE_ACK' : 'CONSULTA WORKLIST',
                patient_id: resolvedPatientId,
                is_qc: false,
                is_calibracion: false,
                is_repeticion: false,
                equipo_origen: dev_name,
                raw_frame,
                ml_descontados: 0,
                fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                procesado: true
            }
        });
        return { success: true, message: 'ACK/QRY CL-900i registrado sin descuento.', data: { logId: newLog.id, descuento: false } };
    }

    // Extraer pruebas de todas las líneas OBX
    const obxLines = raw_frame.split(/[\r\n]+/).filter(l => l.startsWith('OBX|'));
    const testNamesToProcess = [];

    if (obxLines.length > 0) {
        for (const obx of obxLines) {
            const parts = obx.split('|');
            let tName = (parts[4] || parts[3] || '').trim();
            if (!tName || /^\d+$/.test(tName)) {
                if (parts[3] && !/^\d+$/.test(parts[3])) tName = parts[3].trim();
                else continue;
            }
            testNamesToProcess.push(tName);
        }
    }

    // Si no se extrajeron de OBX, usar test_name principal
    if (testNamesToProcess.length === 0 && test_name && test_name !== 'TEST_DESCONOCIDO') {
        testNamesToProcess.push(test_name);
    }

    if (testNamesToProcess.length === 0) {
        const fallbackLog = await prisma.logSniffer.create({
            data: {
                test_name: 'TEST_DESCONOCIDO',
                patient_id: resolvedPatientId,
                is_qc: isQcAuto,
                is_calibracion: isCalAuto,
                is_repeticion: false,
                equipo_origen: dev_name,
                raw_frame,
                ml_descontados: 0,
                fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                procesado: true
            }
        });
        return { success: true, message: '⚠️ CL-900i sin pruebas identificadas en trama.', data: { logId: fallbackLog.id, descuento: false } };
    }

    const todosMapeosCL900 = await getMapeosConItems();

    const itemsCL900 = await prisma.itemInventario.findMany({
        where: {
            activo: true,
            OR: [
                { equipo_asociado: { contains: '900' } },
                { equipo_asociado: { contains: 'CLIA' } },
                { codigo: { contains: '-CL-' } }
            ]
        },
        include: {
            LotesReactivos: {
                where: { Estado: 'Activo', almacen_destino_id: 2 }
            }
        }
    });
    const itemMapCL900 = new Map(itemsCL900.map(i => [i.id, i]));

    const testsToDeduct = [];
    for (const tName of testNamesToProcess) {
        const tUpper = tName.toUpperCase().replace(/\s+/g, ' ');
        const aliasTerms = [tUpper, ...(ANALYZER_ALIASES[tUpper] || [])];

        let candidatos = todosMapeosCL900.filter(m => {
            const it = itemMapCL900.get(m.reactivo_id);
            if (!it) return false;
            const nombreUpper = (m.nombre_prueba || '').trim().toUpperCase();
            const patronTokens = (m.patron_busqueda || '').split('|').map(p => p.trim().toUpperCase()).filter(Boolean);
            const allPatterns = [nombreUpper, ...patronTokens];
            return aliasTerms.some(term => allPatterns.some(pat => term === pat));
        });

        if (candidatos.length === 0) {
            candidatos = todosMapeosCL900.filter(m => {
                const it = itemMapCL900.get(m.reactivo_id);
                if (!it) return false;
                const nombreUpper = (m.nombre_prueba || '').trim().toUpperCase();
                const patronTokens = (m.patron_busqueda || '').split('|').map(p => p.trim().toUpperCase()).filter(Boolean);
                const allPatterns = [nombreUpper, ...patronTokens];
                return aliasTerms.some(term => allPatterns.some(pat => matchToken(term, pat)));
            });
        }

        let elegido = candidatos.find(c => {
            const it = itemMapCL900.get(c.reactivo_id);
            return it && it.LotesReactivos && it.LotesReactivos.length > 0;
        }) || candidatos[0];

        if (elegido) {
            testsToDeduct.push({
                testName: tName,
                mapeo: elegido,
                consumo: Number(elegido.consumo_por_prueba) || 1
            });
        }
    }

    if (testsToDeduct.length === 0) {
        const fallbackLog = await prisma.logSniffer.create({
            data: {
                test_name: testNamesToProcess.join(', '),
                patient_id: resolvedPatientId,
                is_qc: isQcAuto,
                is_calibracion: isCalAuto,
                is_repeticion: false,
                equipo_origen: dev_name,
                raw_frame,
                ml_descontados: 0,
                fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                procesado: true
            }
        });
        return { success: true, message: `⚠️ CL-900i: Pruebas [${testNamesToProcess.join(', ')}] sin mapeo.`, data: { logId: fallbackLog.id, descuento: false } };
    }

    // Ejecutar transacciones de descuento en CLIA 900
    const txResult = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const item of testsToDeduct) {
            let loteAct = await tx.lotesReactivos.findFirst({
                where: {
                    InventarioId: item.mapeo.reactivo_id,
                    Estado: 'Activo',
                    almacen_destino_id: 2
                },
                orderBy: [{ FechaApertura: 'desc' }, { Id: 'desc' }]
            });

            if (!loteAct) {
                loteAct = await tx.lotesReactivos.findFirst({
                    where: {
                        InventarioId: item.mapeo.reactivo_id,
                        Estado: 'Activo'
                    },
                    orderBy: [{ FechaApertura: 'desc' }, { Id: 'desc' }]
                });
            }

            if (loteAct) {
                const updatedLote = await tx.lotesReactivos.update({
                    where: { Id: loteAct.Id },
                    data: { CantidadActual: { decrement: item.consumo } }
                });

                const restMl = Number(updatedLote.CantidadActual);
                const tipoCorrida = isCalAuto ? 'CALIBRACION' : isQcAuto ? 'QC' : 'NORMAL';

                await tx.movimientoInventario.create({
                    data: {
                        item_id: item.mapeo.reactivo_id,
                        tipo_movimiento: 'CONSUMO',
                        cantidad: item.consumo,
                        stock_anterior: Number(loteAct.CantidadActual),
                        stock_nuevo: restMl,
                        motivo: `Consumo Sniffer (${tipoCorrida}) - ${dev_name}`,
                        referencia: `Lote: ${loteAct.NumeroLote} (-${item.consumo} pruebas)`,
                        creado_por: 1
                    }
                });

                const createdLog = await tx.logSniffer.create({
                    data: {
                        test_name: item.testName,
                        patient_id: resolvedPatientId,
                        is_qc: isQcAuto,
                        is_calibracion: isCalAuto,
                        is_repeticion: false,
                        equipo_origen: dev_name,
                        raw_frame,
                        lote_afectado_id: loteAct.Id,
                        ml_descontados: item.consumo,
                        fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                        procesado: true
                    }
                });
                results.push({ testName: item.testName, logId: createdLog.id, loteId: loteAct.Id });
            }
        }
        return results;
    });

    return {
        success: true,
        message: `✅ CL-900i: Descontadas ${txResult.length} prueba(s) hormonales en simultáneo.`,
        data: {
            descuento: txResult.length > 0,
            pruebas: txResult
        }
    };
}

// =========================================================================
// HANDLER: MINDRAY BC 5380 (HEMATOLOGÍA 5 ESTIRPES)
// =========================================================================
async function processBC5380({ raw_frame, test_name, patient_id, is_qc, is_calibracion, is_repeticion, timestamp, isAck, isQry }) {
    const dev_name = 'Mindray BC 5380';
    let resolvedPatientId = patient_id || 'UNKNOWN';

    // Extracción de ID de paciente desde OBR si viene genérico
    if (resolvedPatientId === 'UNKNOWN' || resolvedPatientId === 'PAC-AUTO' || !resolvedPatientId) {
        const obrPidMatch = raw_frame.match(/OBR\|\d+\|\|([^|^|\r\n]+)/);
        if (obrPidMatch && obrPidMatch[1]) {
            resolvedPatientId = obrPidMatch[1].trim();
        }
    }

    const pid_lower = resolvedPatientId.toLowerCase();
    const isQcAuto = is_qc || 
        pid_lower.startsWith('qc') || 
        pid_lower.startsWith('ctrl') || 
        pid_lower.includes('control') ||
        pid_lower.includes('m-53') ||
        pid_lower.includes('lyphochek');

    const isCalAuto = is_calibracion || 
        pid_lower.startsWith('cal') || 
        pid_lower.startsWith('std') || 
        pid_lower.includes('calib');

    if (isAck || isQry) {
        const newLog = await prisma.logSniffer.create({
            data: {
                test_name: isAck ? 'HANDSHAKE_ACK' : 'CONSULTA WORKLIST',
                patient_id: resolvedPatientId,
                is_qc: false,
                is_calibracion: false,
                is_repeticion: false,
                equipo_origen: dev_name,
                raw_frame,
                ml_descontados: 0,
                fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                procesado: true
            }
        });
        return { success: true, message: 'ACK/QRY BC 5380 registrado sin descuento.', data: { logId: newLog.id, descuento: false } };
    }

    // Normalización: 12000 es la prueba hematológica integral
    const resolvedTestName = '12000';

    // Buscar todos los reactivos asociados al Mindray BC 5380
    // Diluyente 20L, M-53LH Lyse, M-LEO(I) Lyse, M-LEO(II) Lyse
    const itemsBC = await prisma.itemInventario.findMany({
        where: {
            activo: true,
            OR: [
                { equipo_asociado: { contains: '5380' } },
                { equipo_asociado: { contains: 'BC' } }
            ]
        },
        select: { id: true, nombre: true, consumo_indicado: true }
    });

    if (itemsBC.length === 0) {
        const fallbackLog = await prisma.logSniffer.create({
            data: {
                test_name: resolvedTestName,
                patient_id: resolvedPatientId,
                is_qc: isQcAuto,
                is_calibracion: isCalAuto,
                is_repeticion: false,
                equipo_origen: dev_name,
                raw_frame,
                ml_descontados: 0,
                fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                procesado: true
            }
        });
        return { success: true, message: '⚠️ Mindray BC 5380 sin reactivos asociados configurados.', data: { logId: fallbackLog.id, descuento: false } };
    }

    const txResult = await prisma.$transaction(async (tx) => {
        const logsCreated = [];
        let totalDescontado = 0;

        for (const item of itemsBC) {
            let consumoMl = Number(item.consumo_indicado) || 1;
            // Si es lisante M-53LH, consumo es típicamente 0.5 mL
            if (item.nombre.toLowerCase().includes('m-53lh')) consumoMl = 0.5;

            // Buscar lote activo abierto del reactivo hematológico
            let loteAct = await tx.lotesReactivos.findFirst({
                where: {
                    InventarioId: item.id,
                    Estado: 'Activo',
                    FechaApertura: { not: null }
                },
                orderBy: [{ FechaApertura: 'desc' }, { Id: 'desc' }]
            });

            if (!loteAct) {
                loteAct = await tx.lotesReactivos.findFirst({
                    where: {
                        InventarioId: item.id,
                        Estado: 'Activo'
                    },
                    orderBy: [{ FechaApertura: 'desc' }, { Id: 'desc' }]
                });
            }

            if (loteAct && consumoMl > 0) {
                const updatedLote = await tx.lotesReactivos.update({
                    where: { Id: loteAct.Id },
                    data: { CantidadActual: { decrement: consumoMl } }
                });

                const restMl = Number(updatedLote.CantidadActual);
                totalDescontado += consumoMl;
                const tipoCorrida = isCalAuto ? 'CALIBRACION' : isQcAuto ? 'QC' : 'NORMAL';

                await tx.movimientoInventario.create({
                    data: {
                        item_id: item.id,
                        tipo_movimiento: 'CONSUMO',
                        cantidad: consumoMl,
                        stock_anterior: Number(loteAct.CantidadActual),
                        stock_nuevo: restMl,
                        motivo: `Consumo Sniffer (${tipoCorrida}) - ${dev_name}`,
                        referencia: `Lote: ${loteAct.NumeroLote} (-${consumoMl}ml)`,
                        creado_por: 1
                    }
                });

                const lLog = await tx.logSniffer.create({
                    data: {
                        test_name: resolvedTestName,
                        patient_id: resolvedPatientId,
                        is_qc: isQcAuto,
                        is_calibracion: isCalAuto,
                        is_repeticion: false,
                        equipo_origen: dev_name,
                        raw_frame,
                        lote_afectado_id: loteAct.Id,
                        ml_descontados: consumoMl,
                        fecha_registro: timestamp ? new Date(timestamp) : new Date(),
                        procesado: true
                    }
                });
                logsCreated.push(lLog);
            }
        }
        return { logsCreated, totalDescontado };
    });

    return {
        success: true,
        message: `✅ BC 5380: Descontados 4 reactivos hematológicos en simultáneo (${txResult.totalDescontado}ml total).`,
        data: {
            descuento: txResult.logsCreated.length > 0,
            logsCount: txResult.logsCreated.length,
            totalMl: txResult.totalDescontado
        }
    };
}

// =========================================================================
// CONTROLADOR PRINCIPAL DEL WEBHOOK SNIFFER
// =========================================================================
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

        const raw_text = raw_frame || '';
        const raw_lower = raw_text.toLowerCase();
        let dev_name = equipo_origen || 'UNKNOWN_DEVICE';
        const dev_lower = dev_name.toLowerCase();

        // Identificación y Normalización estricta de equipo por IP, nombre y trama HL7/ASTM
        if (dev_name === '192.168.10.188' || dev_lower.includes('wiener') || dev_lower.includes('cm 260') || dev_lower.includes('cm260') || raw_lower.includes('25053213')) {
            dev_name = 'CM 260i';
        } else if (dev_name === '192.168.30.211' || dev_lower.includes('cl-900') || dev_lower.includes('cl900') || dev_lower.includes('clia') || raw_lower.includes('cl-900')) {
            dev_name = 'CLIA 900i';
        } else if (dev_name === '192.168.10.62' || dev_lower.includes('5380') || dev_lower.includes('bc-5380') || dev_lower.includes('bc5380') || raw_lower.includes('bc-5380')) {
            dev_name = 'Mindray BC 5380';
        } else if (dev_name === '192.168.30.148' || dev_lower.includes('bs-230') || dev_lower.includes('bs 230') || dev_lower.includes('bs230')) {
            dev_name = 'Mindray BS 230';
        }

        const isAck = raw_text.includes('ACK^R01') || raw_text.includes('MSA|AA');
        const isQry = raw_text.includes('QRY^Q02');

        // Filtro Anti-Duplicados (Idempotencia de red)
        let msgControlId = null;
        if (raw_text.includes('MSH|')) {
            const mshMatch = raw_text.match(/MSH\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|([^|]+)\|/);
            if (mshMatch && mshMatch[1]) {
                msgControlId = mshMatch[1].trim();
            }
        }
        const dedupKey = msgControlId 
            ? `${dev_name}_MSH_${msgControlId}` 
            : `${dev_name}_${test_name}_${patient_id}_${raw_text.slice(0, 80)}`;

        const nowMs = Date.now();
        if (recentMessagesCache.has(dedupKey)) {
            const lastSeen = recentMessagesCache.get(dedupKey);
            if (nowMs - lastSeen < 12000) {
                return res.status(200).json({
                    success: true,
                    message: 'Trama duplicada ignorada (Idempotencia)',
                    is_duplicate: true
                });
            }
        }
        recentMessagesCache.set(dedupKey, nowMs);

        // BIFURCACIÓN MODULAR SEGÚN EL ANALIZADOR ESPECÍFICO
        let result;
        const payload = { raw_frame: raw_text, test_name, patient_id, is_qc, is_calibracion, is_repeticion, timestamp, isAck, isQry };

        switch (dev_name) {
            case 'CM 260i':
                result = await processCM260i(payload);
                break;
            case 'Mindray BS 230':
                result = await processBS230(payload);
                break;
            case 'CLIA 900i':
                result = await processCL900i(payload);
                break;
            case 'Mindray BC 5380':
                result = await processBC5380(payload);
                break;
            default:
                // Fallback por defecto si no es reconocido
                result = await processCM260i(payload);
                break;
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error('[Sniffer Webhook] Error:', error);
        return res.status(500).json({ success: false, message: 'Error procesando la trama.', error: error.message });
    }
};

// Obtener los logs para mostrarlos en el Dashboard Frontend
exports.getSnifferLogs = async (req, res) => {
    try {
        const logs = await prisma.logSniffer.findMany({
            orderBy: {
                fecha_registro: 'desc'
            },
            take: 250
        });

        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        console.error('[Sniffer Get Logs] Error:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo los logs.' });
    }
};
