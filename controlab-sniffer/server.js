/**
 * CONTROLAB IA - CANS (Controlab AI Network Sniffer)
 * Parser Universal de Tramas ASTM E1394 / HL7 v2.x
 * Versión 2.0 - Compatible con cualquier analizador clínico
 * 
 * Analizadores probados: Mindray BS-230, BC-5000, BC-5380, CLIA CL-900, CA-500 Sysmex
 * Compatibilidad general: Roche Cobas, Ortho Vitros, Beckman, Abbott
 */

const net = require('net');
const axios = require('axios');
require('dotenv').config();

// ─── Configuración ──────────────────────────────────────────────────────────
const INGRESS_PORT  = process.env.INGRESS_PORT  || 6001;
const EGRESS_PORT   = process.env.EGRESS_PORT   || 5001;
const EGRESS_HOST   = process.env.EGRESS_HOST   || '127.0.0.1';
const API_URL       = process.env.CONTROLAB_API_URL || 'http://localhost:5000/api/sniffer/webhook';
const API_KEY       = process.env.SNIFFER_API_KEY || '';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║     CONTROLAB IA - Universal Network Sniffer v2.0    ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log(`[CANS] ► Escuchando analizadores en   PUERTO: ${INGRESS_PORT}`);
console.log(`[CANS] ► Redirigiendo tráfico a LIS:  ${EGRESS_HOST}:${EGRESS_PORT}`);
console.log(`[CANS] ► Enviando eventos al backend: ${API_URL}`);
console.log('─'.repeat(60));

// ─── Palabras clave universales de Control de Calidad (QC) ──────────────────
// Cubrimos los nombres de controles más comunes de los principales fabricantes
const QC_KEYWORDS = [
    // Genéricos
    'qc', 'ctrl', 'control', 'ctrlnorm', 'ctrlalt', 'ctrlhigh', 'ctrlow',
    // Mindray / Bio-Rad
    'clim', 'n qc', 'norm', 'abnorm', 'path', 'bc ctrl', 'bs ctrl',
    // Sysmex
    'e-check', 'se-check', 'xn-check', 'micro',
    // Roche / Cobas
    'precinorm', 'precipath', 'cfas', 'titrol', 'c.f.a.s',
    // Beckman / Vitros
    'liquichek', 'lyphochek', 'multichem', 'biorad',
    // Misceláneos
    'qcn', 'qca', 'qcp', 'standard', 'blanks', 'blank', 'h2o', 'ref'
];

// ─── Palabras clave de Calibración ──────────────────────────────────────────
const CAL_KEYWORDS = [
    'cal', 'calib', 'calibrator', 'calibracion', 'std', 'estandar',
    'standard', 'span', 'zero', 'offset', 'adjust', 'cfas',
    'factored', 'factory'
];

// ─── Función principal: Detectar tipo de frame automáticamente ───────────────
function detectFrameType(frame) {
    // HL7 empieza con MSH, ASTM con H| o STX+H
    if (frame.includes('MSH|')) return 'HL7';
    if (frame.includes('H|') || frame.includes('\x02H|')) return 'ASTM';
    // HL7 POCD
    if (frame.includes('OBX|') && frame.includes('PID|')) return 'HL7';
    return 'ASTM'; // Default: la mayoría de analizadores habla ASTM
}

// ─── Parser Universal ASTM E1394 ─────────────────────────────────────────────
function parseASTMFrame(frame) {
    const results = [];

    // Normalizar separadores: ASTM puede usar \r, \n, o \r\n
    const normalizedFrame = frame.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Limpiar caracteres de control ASTM (STX=0x02, ETX=0x03, ENQ=0x05, ACK=0x06, EOT=0x04)
    const cleanFrame = normalizedFrame.replace(/[\x02\x03\x04\x05\x06]/g, '');
    
    const lines = cleanFrame.split('\n').filter(l => l.trim().length > 1);

    let currentPatientId   = null;
    let currentPatientName = null;
    let currentSampleId    = null;
    let currentOrderType   = null; // 'R' = Routine, 'Q' = QC, 'C' = Calibration, 'S' = Stat

    for (const rawLine of lines) {
        // Extraer tipo de registro (primer char no-numérico después del número de secuencia)
        // ASTM: P|1|..., R|1|..., O|1|..., H|..., L|...
        // También puede venir con el número de frame ASTM: 1P|1|...
        const line = rawLine.replace(/^\d+/, '').trim(); // quitar número de frame si existe
        const parts = line.split('|');
        if (parts.length < 2) continue;

        const recordType = parts[0].toUpperCase();

        // ── Registro de Paciente (P) ──────────────────────────────────────────
        if (recordType === 'P') {
            currentPatientId   = (parts[2] || '').trim()  || (parts[3] || '').trim() || 'UNKNOWN';
            currentPatientName = (parts[5] || '').trim().replace(/\^/g, ' ').trim();
            // Mindray usa el campo de nombre para marcar controles
            if (!currentPatientId || currentPatientId === '') {
                currentPatientId = 'UNKNOWN';
            }
        }

        // ── Registro de Orden (O) - Indica si es rutina, QC, stat ────────────
        if (recordType === 'O') {
            currentSampleId = (parts[2] || parts[3] || '').trim();
            // parts[5] = priority: 'R' Routine, 'S' Stat, 'E' ASAP, 'Q' QC, 'C' Calibration
            const priority = (parts[5] || '').toUpperCase();
            if (priority === 'Q') currentOrderType = 'QC';
            else if (priority === 'C') currentOrderType = 'CALIBRACION';
            else currentOrderType = 'NORMAL';
        }

        // ── Registro de Resultado (R) - El más importante ────────────────────
        if (recordType === 'R') {
            // Formato: R|seq|testId^^^unitSystem^testName|value|unit|range|flag|...
            const testCodeRaw = (parts[2] || '').trim();
            const testParts   = testCodeRaw.split('^');
            const testId      = testParts[0].replace(/\s/g, '').toUpperCase();
            const testName    = (testParts[3] || testParts[4] || testParts[0] || '').trim();
            
            // El nombre legible es más confiable para el mapeo
            const resolvedTestName = testName || testId;

            const value       = (parts[3] || '').trim();
            const unit        = (parts[4] || '').trim();
            const refRange    = (parts[5] || '').trim();
            const flags       = (parts[6] || '').trim(); // H=High, L=Low, C=Corrected, R=Repeat
            const resultStatus = (parts[8] || '').trim().toUpperCase();

            if (!resolvedTestName || resolvedTestName === '') continue;

            // Detectar repetición por flags del equipo (más confiable que tiempo)
            const isRepByFlag = ['R', 'CR', 'RC', 'D'].includes(flags.toUpperCase());

            results.push({
                test_id:       testId,
                test_name:     resolvedTestName,
                value:         value,
                unit:          unit,
                ref_range:     refRange,
                flags:         flags,
                is_repeticion: isRepByFlag,
                order_type:    currentOrderType
            });
        }
    }

    return {
        patient_id:   currentPatientId   || 'UNKNOWN',
        patient_name: currentPatientName || '',
        sample_id:    currentSampleId    || '',
        order_type:   currentOrderType   || 'NORMAL',
        results
    };
}

// ─── Parser Universal HL7 v2.x ────────────────────────────────────────────────
function parseHL7Frame(frame) {
    const results = [];
    const lines   = frame.split(/\r?\n/).filter(l => l.trim() !== '');

    let currentPatientId = null;
    let currentOrderType = 'NORMAL';

    for (const line of lines) {
        const seg = line.substring(0, 3);
        const parts = line.split('|');

        // ── Patient ID Segment ────────────────────────────────────────────────
        if (seg === 'PID') {
            // PID-3: Patient ID list, PID-5: Patient Name
            const pidList = (parts[3] || '').split('~')[0];
            currentPatientId = (pidList.split('^')[0] || '').trim() || 'UNKNOWN';
        }

        // ── Order Segment ─────────────────────────────────────────────────────
        if (seg === 'OBR') {
            // OBR-11: Specimen Action Code: 'G'=Generate, 'Q'=QC, 'L'=Lab Order
            const actionCode = (parts[11] || '').toUpperCase();
            if (actionCode === 'Q') currentOrderType = 'QC';
        }

        // ── Observation Segment (Resultados) ──────────────────────────────────
        if (seg === 'OBX') {
            // OBX-3: Observation Identifier, OBX-5: Value
            const obsId   = (parts[3] || '').split('^');
            const testId  = obsId[0].trim();
            const testName = (obsId[1] || obsId[2] || obsId[0] || '').trim();
            const value    = (parts[5] || '').trim();
            const unit     = (parts[6] || '').trim();

            if (!testId) continue;

            results.push({
                test_id:       testId,
                test_name:     testName || testId,
                value:         value,
                unit:          unit,
                ref_range:     '',
                flags:         '',
                is_repeticion: false,
                order_type:    currentOrderType
            });
        }
    }

    return {
        patient_id:   currentPatientId || 'UNKNOWN',
        patient_name: '',
        sample_id:    '',
        order_type:   currentOrderType,
        results
    };
}

// ─── Clasificador Universal de Tipo de Corrida ────────────────────────────────
function classifyRun(parsed, rawFrame) {
    const pid  = (parsed.patient_id  || '').toLowerCase().replace(/\s/g, '');
    const name = (parsed.patient_name || '').toLowerCase().replace(/\s/g, '');
    const sid  = (parsed.sample_id   || '').toLowerCase().replace(/\s/g, '');
    const raw  = rawFrame.toLowerCase();

    // 1. Señal explícita del equipo en el campo de Orden (más confiable)
    if (parsed.order_type === 'QC')          return 'QC';
    if (parsed.order_type === 'CALIBRACION') return 'CALIBRACION';

    // 2. Buscar en ID de Paciente, Nombre y ID de Muestra
    const searchTargets = [pid, name, sid];
    for (const target of searchTargets) {
        if (CAL_KEYWORDS.some(k => target.includes(k))) return 'CALIBRACION';
        if (QC_KEYWORDS.some(k  => target.includes(k))) return 'QC';
    }

    // 3. Buscar en el frame crudo completo (búsqueda de seguridad)
    // Solo aplicamos si el campo de paciente no tiene datos reales (ID numérico corto)
    const isNumericPid = /^\d{1,6}$/.test(pid);
    if (!isNumericPid) {
        if (CAL_KEYWORDS.some(k => raw.includes(k))) return 'CALIBRACION';
        if (QC_KEYWORDS.some(k  => raw.includes(k))) return 'QC';
    }

    return 'NORMAL';
}

// ─── Función principal de procesamiento ──────────────────────────────────────
async function processFrame(rawBuffer, equipoIp) {
    const frame = rawBuffer.toString('latin1'); // latin1 es más robusto que utf-8 para ASTM binario

    // Ignorar frames de control (ACK, ENQ, EOT solos)
    if (frame.trim().length < 5) return;

    const frameType = detectFrameType(frame);
    let parsed;

    if (frameType === 'HL7') {
        parsed = parseHL7Frame(frame);
    } else {
        parsed = parseASTMFrame(frame);
    }

    // Clasificar tipo de corrida
    const runType = classifyRun(parsed, frame);

    // Procesar cada resultado de la trama
    for (const result of parsed.results) {
        const isQC          = runType === 'QC'          || result.order_type === 'QC';
        const isCalibración = runType === 'CALIBRACION'  || result.order_type === 'CALIBRACION';
        const isRepeticion  = result.is_repeticion;

        const resolvedType = isCalibración ? 'CALIBRACION' : isQC ? 'QC' : isRepeticion ? 'REPETICION' : 'NORMAL';

        const payload = {
            raw_frame:       frame.substring(0, 2000), // Limitar tamaño del log
            test_name:       result.test_name,
            test_id_equipo:  result.test_id,           // Código original del equipo para mapeo
            patient_id:      parsed.patient_id,
            is_qc:           isQC,
            is_calibracion:  isCalibración,
            is_repeticion:   isRepeticion,
            equipo_origen:   equipoIp,
            frame_type:      frameType,
            valor:           result.value,
            unidad:          result.unit,
            timestamp:       new Date().toISOString()
        };

        const icon = isCalibración ? '🔵' : isQC ? '🟡' : isRepeticion ? '🔄' : '🟢';
        console.log(`${icon} [${resolvedType}] ${result.test_name} (${result.value} ${result.unit}) - Equipo: ${equipoIp}`);

        try {
            const headers = API_KEY ? { 'x-api-key': API_KEY } : {};
            await axios.post(API_URL, payload, { headers, timeout: 3000 });
        } catch (err) {
            console.error(`[!] Error enviando al backend: ${err.message}`);
        }
    }
}

// ─── Servidor TCP (Proxy transparente para múltiples equipos) ─────────────────
const server = net.createServer((clientSocket) => {
    const equipoIp = clientSocket.remoteAddress || 'UNKNOWN';
    console.log(`[+] Equipo conectado: ${equipoIp}:${clientSocket.remotePort}`);

    // Conectar al LIS real
    const lisSocket = net.connect(EGRESS_PORT, EGRESS_HOST, () => {
        console.log(`[↔] Puente establecido: ${equipoIp} ←→ LIS ${EGRESS_HOST}:${EGRESS_PORT}`);
    });

    lisSocket.on('error', (err) => {
        // No tumbar el sniffer si el LIS no responde
        console.warn(`[!] LIS no disponible (${err.message}). El sniffer continúa registrando.`);
    });

    clientSocket.on('error', (err) => {
        console.error(`[!] Error en socket del equipo ${equipoIp}:`, err.message);
    });

    // ── Interceptar datos del analizador ──────────────────────────────────────
    let frameBuffer = Buffer.alloc(0);

    clientSocket.on('data', (data) => {
        // 1. Reenviar al LIS INMEDIATAMENTE (sin demora, transparencia total)
        if (!lisSocket.destroyed) {
            lisSocket.write(data);
        }

        // 2. Acumular buffer para reconstruir tramas completas
        frameBuffer = Buffer.concat([frameBuffer, data]);

        // Detectar fin de trama ASTM: EOT (0x04) o L|... record
        const frameStr = frameBuffer.toString('latin1');
        if (frameStr.includes('\x04') || frameStr.includes('\nL|') || frameStr.includes('\rL|')) {
            // Trama completa recibida
            const capturedFrame = Buffer.from(frameBuffer);
            frameBuffer = Buffer.alloc(0); // Resetear buffer
            
            processFrame(capturedFrame, equipoIp).catch(err => {
                console.error(`[!] Error procesando trama de ${equipoIp}:`, err.message);
            });
        }
    });

    // Respuestas del LIS → Analizador
    lisSocket.on('data', (data) => {
        if (!clientSocket.destroyed) {
            clientSocket.write(data);
        }
    });

    clientSocket.on('close', () => {
        console.log(`[-] Equipo desconectado: ${equipoIp}`);
        if (!lisSocket.destroyed) lisSocket.end();
    });

    lisSocket.on('close', () => {
        if (!clientSocket.destroyed) clientSocket.end();
    });
});

server.listen(INGRESS_PORT, '0.0.0.0', () => {
    console.log(`\n✅ [CANS] Sniffer activo. Escuchando en TODAS las interfaces en puerto ${INGRESS_PORT}`);
    console.log(`   Conecta tus analizadores a esta IP en el puerto ${INGRESS_PORT} en lugar del LIS.`);
    console.log('─'.repeat(60));
});

server.on('error', (err) => {
    console.error(`[FATAL] Error en el servidor CANS: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
        console.error(`   El puerto ${INGRESS_PORT} ya está en uso. Verifica que no haya otra instancia corriendo.`);
    }
    process.exit(1);
});
