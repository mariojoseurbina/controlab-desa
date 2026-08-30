const net = require('net');
const axios = require('axios');
require('dotenv').config();

const CONTROLAB_API_URL = process.env.CONTROLAB_API_URL || 'http://192.168.40.251:5000/api/sniffer/webhook';
const mappingsStr = process.env.PROXY_MAPPINGS || '5155:127.0.0.1:5155,5050:127.0.0.1:5050';

console.log(`[CANS]=============================================`);
console.log(`[CANS] Iniciando Controlab IA TCP Proxy Bridge (Universal)...`);
console.log(`[CANS]=============================================`);

const mappings = mappingsStr.split(',').map(m => {
    const parts = m.split(':');
    if (parts.length < 3) {
        console.error(`[!] Mapeo inválido: ${m}. Debe tener el formato IngressPort:EgressHost:EgressPort`);
        return null;
    }
    return {
        ingressPort: parseInt(parts[0].trim(), 10),
        egressHost: parts[1].trim(),
        egressPort: parseInt(parts[2].trim(), 10)
    };
}).filter(m => m !== null);

if (mappings.length === 0) {
    console.error(`[!] No se cargaron mapeos válidos. Deteniendo sniffer.`);
    process.exit(1);
}

// Iniciar un servidor TCP por cada mapeo configurado
mappings.forEach(mapping => {
    const server = net.createServer((clientSocket) => {
        const remoteInfo = `${clientSocket.remoteAddress}:${clientSocket.remotePort}`;
        console.log(`[+] [Puerto ${mapping.ingressPort}] Nueva conexión de analizador: ${remoteInfo}`);

        let sessionBuffer = ''; // Buffer para acumular paquetes fragmentados de la misma transmisión

        // Conectar a LIS (Infolab)
        const lisSocket = net.connect(mapping.egressPort, mapping.egressHost, () => {
            console.log(`[+] [Puerto ${mapping.ingressPort}] Conexión puente establecida con LIS en ${mapping.egressHost}:${mapping.egressPort}`);
        });

        // Manejo de errores
        lisSocket.on('error', (err) => {
            console.error(`[!] [Puerto ${mapping.ingressPort}] Error al conectar con LIS (${mapping.egressHost}:${mapping.egressPort}):`, err.message);
        });

        clientSocket.on('error', (err) => {
            console.error(`[!] [Puerto ${mapping.ingressPort}] Error en socket del analizador:`, err.message);
        });

        // Interceptar datos del analizador
        clientSocket.on('data', (data) => {
            // 1. Reenviar a LIS inmediatamente (Transparencia absoluta)
            if (!lisSocket.destroyed) {
                lisSocket.write(data);
            }

            const rawChunk = data.toString('utf-8');
            sessionBuffer += rawChunk;

            // En el protocolo ASTM, el carácter EOT (End of Transmission, ASCII 0x04) marca el final del envío
            // Si detectamos EOT (0x04), enviamos la trama completa acumulada al cerebro de Controlab
            if (data.includes(0x04) || rawChunk.includes('\x04')) {
                const fullFrame = sessionBuffer;
                sessionBuffer = ''; // Limpiar buffer para la siguiente muestra
                
                processASTMFrame(fullFrame, mapping.ingressPort).catch(err => {
                    console.error(`[!] [Puerto ${mapping.ingressPort}] Error al procesar trama por EOT:`, err.message);
                });
            }
        });

        // Reenviar respuestas de LIS de vuelta al analizador
        lisSocket.on('data', (data) => {
            if (!clientSocket.destroyed) {
                clientSocket.write(data);
            }
        });
        
        clientSocket.on('close', () => {
            console.log(`[-] [Puerto ${mapping.ingressPort}] Analizador desconectado.`);
            lisSocket.end();

            // Si el socket se cierra y quedó algo de data en el buffer sin enviar por falta de EOT, la enviamos
            if (sessionBuffer.trim().length > 0) {
                const remainingFrame = sessionBuffer;
                sessionBuffer = '';
                processASTMFrame(remainingFrame, mapping.ingressPort).catch(err => {
                    console.error(`[!] [Puerto ${mapping.ingressPort}] Error al procesar trama restante al cerrar:`, err.message);
                });
            }
        });

        lisSocket.on('close', () => {
            console.log(`[-] [Puerto ${mapping.ingressPort}] LIS cerró la conexión.`);
            clientSocket.end();
        });
    });

    server.listen(mapping.ingressPort, '0.0.0.0', () => {
        console.log(`[✔] Escuchando en puerto ${mapping.ingressPort} ➔ Redirigiendo a LIS en ${mapping.egressHost}:${mapping.egressPort}`);
    });
});

// Función de procesamiento de tramas ASTM Universal
async function processASTMFrame(frame, ingressPort) {
    // Buscar banderas de Control de Calidad (QC)
    const isQC = frame.includes('QC') || frame.includes('|C|') || frame.toLowerCase().includes('control');
    const records = frame.split(/[\r\n]+/);
    
    let testName = null;
    let patientId = null;

    for (let record of records) {
        const cleanRecord = record.trim();
        if (cleanRecord.startsWith('P|')) {
            const parts = cleanRecord.split('|');
            if (parts.length > 2) {
                patientId = parts[2].trim();
            }
        }
        if (cleanRecord.startsWith('R|')) {
            const parts = cleanRecord.split('|');
            if (parts.length > 2) {
                const testParts = parts[2].split('^');
                testName = testParts[0].trim();
            }
        }
    }

    // Mapeo rápido fallback si no viene estructurado en registros R| y P|
    if (!testName) {
        if (frame.includes('GLU')) testName = 'GLU';
        else if (frame.includes('UREA')) testName = 'UREA';
        else if (frame.includes('CREA')) testName = 'CREA';
        else if (frame.includes('COL')) testName = 'COL';
    }

    // INTERFAZ UNIVERSAL: Incluso si no logramos extraer el nombre de la prueba específico,
    // ENVIAMOS la trama completa al Webhook para que quede registrada en la base de datos de auditoría.
    const payload = {
        raw_frame: frame,
        test_name: testName || 'RAW_FRAME',
        patient_id: patientId || (isQC ? 'QC_CONTROL' : 'UNKNOWN'),
        is_qc: isQC,
        timestamp: new Date().toISOString()
    };

    try {
        await axios.post(CONTROLAB_API_URL, payload);
        console.log(`[IA] [Puerto ${ingressPort}] ☑ Trama registrada: ${payload.test_name} (QC: ${payload.is_qc}, Paciente: ${payload.patient_id})`);
    } catch (error) {
        console.error(`[IA] [Puerto ${ingressPort}] ❌ Error al enviar al webhook de Controlab: ${error.message}`);
    }
}
