const net = require('net');

const PORT = 5150;
const WEBHOOK_URL = 'http://192.168.40.251:5000/api/sniffer/webhook';
const EQUIPO_ORIGEN = 'CLIA 900i';

console.log('========================================================');
console.log(`🤖 CONTROLAB IA - AGENTE LOCAL CLIA 900i`);
console.log(`Escuchando en el puerto ${PORT}...`);
console.log(`Enviando resultados a: ${WEBHOOK_URL}`);
console.log('========================================================\n');

const server = net.createServer((socket) => {
    console.log(`[+] Conexión entrante local detectada.`);
    let buffer = '';

    socket.on('data', async (data) => {
        const rawData = data.toString('latin1');
        buffer += rawData;
        console.log(`[DATA RECIBIDA] ${rawData.length} bytes`);
        
        const ACK = Buffer.from([0x06]);
        socket.write(ACK);

        if (buffer.includes('\x04') || buffer.includes('\x03') || buffer.includes('\x1c') || buffer.includes('PID|') || buffer.includes('OBR|')) {
            const frameToProcess = buffer;
            buffer = '';
            
            console.log(`\n--- TRAMA COMPLETA RECIBIDA ---`);
            
            let patientId = null;
            let testsFound = []; // Almacenar todas las pruebas encontradas
            
            const lines = frameToProcess.replace(/\r/g, '\n').split('\n');
            for (let line of lines) {
                if (line.includes('P|') || line.includes('PID|')) {
                    const parts = line.split('|');
                    if (parts.length > 2) patientId = parts[2].trim();
                }
                if (line.includes('R|') || line.includes('OBR|') || line.includes('OBX|')) {
                    if (line.includes('TSH')) testsFound.push('TSH');
                    if (line.includes('FT3') || line.includes('T3')) testsFound.push('FT3');
                    if (line.includes('FT4') || line.includes('T4')) testsFound.push('FT4');
                    if (line.includes('ANTI-TG')) testsFound.push('ANTI-TG');
                    // Add more mappings if necessary
                }
            }

            // Eliminar duplicados en caso de que OBX y OBR tengan el mismo nombre
            testsFound = [...new Set(testsFound)];

            if (testsFound.length === 0) {
                 if (frameToProcess.includes('TSH')) testsFound.push('TSH');
                 if (frameToProcess.includes('FT3')) testsFound.push('FT3');
                 if (frameToProcess.includes('FT4')) testsFound.push('FT4');
            }

            if (testsFound.length === 0) {
                 testsFound.push('RAW_TEST'); // Fallback
            }
            
            for (const testName of testsFound) {
                const payload = {
                    raw_frame: frameToProcess,
                    test_name: testName,
                    patient_id: patientId || 'UNKNOWN_PAC',
                    is_qc: false,
                    equipo_origen: EQUIPO_ORIGEN,
                    timestamp: new Date().toISOString()
                };

                try {
                    await fetch(WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    console.log(`[✔] Enviado a Controlab IA con éxito: ${payload.test_name} (Paciente: ${payload.patient_id})`);
                } catch (err) {
                    console.error(`[❌] Error al enviar al Servidor Controlab:`, err.message);
                }
            }
        }
    });

    socket.on('error', (err) => console.error(`[!] Error socket:`, err.message));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[OK] Agente activo. Transmite desde el analizador ahora.`);
});
