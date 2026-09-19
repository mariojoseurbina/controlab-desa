const net = require('net');
const axios = require('axios');

const PORT = 5150; // Puerto donde escucha el LIS Virtual
const WEBHOOK_URL = 'http://127.0.0.1:5000/api/sniffer/webhook';
const EQUIPO_ORIGEN = 'CLIA 900i';

console.log('========================================================');
console.log(`🤖 CONTROLAB IA - LIS VIRTUAL (EMULADOR RECEPTOR)`);
console.log(`Escuchando conexiones de analizadores en el Puerto: ${PORT}`);
console.log('========================================================\n');

const server = net.createServer((socket) => {
    console.log(`[+] Conexión entrante desde: ${socket.remoteAddress}:${socket.remotePort}`);
    let buffer = '';

    socket.on('data', async (data) => {
        const rawData = data.toString('latin1');
        buffer += rawData;
        
        // Mostrar en consola (resumido)
        console.log(`[DATA RECIBIDA] ${rawData.length} bytes`);
        
        // Enviar acuse de recibo (ACK) estándar ASTM para que el equipo sepa que recibimos el paquete
        const ACK = Buffer.from([0x06]);
        socket.write(ACK);

        // Si la trama tiene el fin de texto (0x03) o EOT (0x04) o linebreaks, intentamos extraer e informar
        if (rawData.includes('\x04') || rawData.includes('\x03') || rawData.includes('L|1|N')) {
            const frameToProcess = buffer;
            buffer = ''; // Limpiar buffer
            
            console.log(`\n--- TRAMA COMPLETA RECIBIDA ---`);
            
            // Intento básico de extraer paciente y prueba
            let testName = null;
            let patientId = null;
            
            const lines = frameToProcess.replace(/\r/g, '\n').split('\n');
            for (let line of lines) {
                if (line.includes('P|')) {
                    const parts = line.split('|');
                    if (parts.length > 2) patientId = parts[2].trim();
                }
                if (line.includes('R|') || line.includes('OBR|') || line.includes('OBX|')) {
                    if (line.includes('TSH')) testName = 'TSH';
                    else if (line.includes('FT3') || line.includes('T3')) testName = 'FT3';
                    else if (line.includes('FT4') || line.includes('T4')) testName = 'FT4';
                    
                    if (!testName) {
                        const parts = line.split('|');
                        if (line.startsWith('R|') && parts.length > 2) {
                            testName = parts[2].replace(/\^/g, ' ').trim();
                        }
                    }
                }
            }

            // Fallback si no encuentra
            if (!testName && frameToProcess.includes('TSH')) testName = 'TSH';
            if (!testName && frameToProcess.includes('FT3')) testName = 'FT3';
            if (!testName && frameToProcess.includes('FT4')) testName = 'FT4';
            
            const payload = {
                raw_frame: frameToProcess,
                test_name: testName || 'RAW_TEST',
                patient_id: patientId || 'UNKNOWN_PAC',
                is_qc: false,
                equipo_origen: EQUIPO_ORIGEN,
                timestamp: new Date().toISOString()
            };

            try {
                await axios.post(WEBHOOK_URL, payload);
                console.log(`[✔] Enviado a Controlab IA: ${payload.test_name} (Paciente: ${payload.patient_id})`);
            } catch (err) {
                console.error(`[❌] Error al enviar al Webhook:`, err.message);
            }
        }
    });

    socket.on('error', (err) => {
        console.error(`[!] Error en el socket:`, err.message);
    });

    socket.on('close', () => {
        console.log(`[-] Conexión cerrada con ${socket.remoteAddress}`);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[OK] Servidor LIS Virtual activo. Esperando que el CLIA 900i envíe datos al puerto ${PORT}...`);
});
