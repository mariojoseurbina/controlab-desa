const { spawn, execSync } = require('child_process');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const CONTROLAB_API_URL = process.env.CONTROLAB_API_URL || 'http://192.168.40.251:5000/api/sniffer/webhook';
const MAPPINGS = (process.env.PROXY_MAPPINGS || '5155,5050').split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
const NIC_INDEX = process.env.SNIFFER_NIC_INDEX || '2';

console.log(`=========================================================`);
console.log(`🕵️‍♂️ INICIANDO MOTOR DE SNIFFER PASIVO (OPCIÓN A)`);
console.log(`=========================================================`);
console.log(`IP de Controlab IA: ${CONTROLAB_API_URL}`);
console.log(`Puertos a interceptar: ${MAPPINGS.join(', ')}`);
console.log(`=========================================================\n`);

// Buscar si tshark (Wireshark CLI) está instalado
let tsharkPath = 'tshark';
try {
    execSync('tshark -v', { stdio: 'ignore' });
} catch (e) {
    // Probar ruta estándar de Windows
    const standardPath = 'C:\\Program Files\\Wireshark\\tshark.exe';
    if (fs.existsSync(standardPath)) {
        tsharkPath = standardPath;
    } else {
        tsharkPath = null;
    }
}

if (tsharkPath) {
    runTsharkEngine();
} else {
    runPktmonEngine();
}

// ---------------------------------------------------------
// MOTOR 1: TSHARK (Captura en Tiempo Real)
// ---------------------------------------------------------
function runTsharkEngine() {
    console.log(`[✔] Wireshark/Tshark detectado en: ${tsharkPath}`);
    console.log(`[*] Iniciando captura en tiempo real sobre la Tarjeta Virtual #${NIC_INDEX}...`);
    console.log(`(Puedes listar tus tarjetas corriendo: tshark -D)\n`);

    const filter = MAPPINGS.map(p => `tcp port ${p}`).join(' or ');
    
    // Comando para capturar payload TCP en hex
    const args = [
        '-i', NIC_INDEX,
        '-f', filter,
        '-T', 'fields',
        '-e', 'tcp.payload',
        '-l' // Forzar salida en vivo
    ];

    const child = spawn(tsharkPath, args);

    child.stdout.on('data', (data) => {
        const lines = data.toString('utf-8').split('\n');
        for (let line of lines) {
            const hex = line.trim().replace(/:/g, ''); // Limpiar formato hex
            if (hex && hex.length > 0) {
                const asciiText = Buffer.from(hex, 'hex').toString('utf-8');
                // Si la trama tiene datos ASTM, procesar
                if (asciiText.includes('P|') || asciiText.includes('R|') || asciiText.includes('QC')) {
                    processASTMFrame(asciiText, 'TSHARK').catch(err => {
                        console.error(`[!] Error procesando trama tshark:`, err.message);
                    });
                }
            }
        }
    });

    child.stderr.on('data', (data) => {
        // Ignorar avisos normales de captura, solo imprimir errores reales
        const msg = data.toString('utf-8');
        if (msg.toLowerCase().includes('error')) {
            console.error(`[tshark] info:`, msg.trim());
        }
    });

    child.on('close', (code) => {
        console.log(`[!] El proceso tshark se cerró con código: ${code}. Reintentando en 5s...`);
        setTimeout(runTsharkEngine, 5000);
    });
}

// ---------------------------------------------------------
// MOTOR 2: PKTMON (Captura en Bucle sin instalar nada)
// ---------------------------------------------------------
async function runPktmonEngine() {
    console.log(`[!] Wireshark no detectado. Iniciando motor nativo Windows PktMon...`);
    console.log(`[*] Estableciendo filtros de puertos en Windows...`);

    try {
        execSync('pktmon filter remove', { stdio: 'ignore' });
    } catch(e){}

    MAPPINGS.forEach(port => {
        try {
            execSync(`pktmon filter add -p ${port}`);
            console.log(`[✔] Filtro agregado para puerto: ${port}`);
        } catch(e){
            console.error(`[!] No se pudo agregar filtro para puerto ${port}:`, e.message);
        }
    });

    console.log(`\n[*] Iniciando bucle de captura pasiva (Intervalo: 5 segundos)...`);
    console.log(`Presiona Ctrl+C para detener.\n`);

    while (true) {
        try {
            // Iniciar captura
            execSync('pktmon start --capture --pkt-size 0 --file-name temp_capture.etl', { stdio: 'ignore' });
            
            // Esperar 5 segundos
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Detener
            execSync('pktmon stop', { stdio: 'ignore' });
            
            // Convertir a texto con volcado HEX
            execSync('pktmon etl2txt temp_capture.etl --hex --verbose 3 --out temp_trace.txt', { stdio: 'ignore' });
            
            if (fs.existsSync('temp_trace.txt')) {
                const textLog = fs.readFileSync('temp_trace.txt', 'utf8');
                parsePktmonText(textLog);
                fs.unlinkSync('temp_trace.txt');
            }
            if (fs.existsSync('temp_capture.etl')) {
                fs.unlinkSync('temp_capture.etl');
            }
        } catch (error) {
            console.error(`[!] Error en bucle PktMon:`, error.message);
            // Evitar bucle infinito de errores sin pausa
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

// Parsear el volcado hexadecimal de PktMon.txt
function parsePktmonText(textLog) {
    const lines = textLog.split('\n');
    let currentHex = '';
    
    for (let line of lines) {
        const clean = line.trim();
        // Las líneas de datos hexadecimales en pktmon etl2txt empiezan con bytes en formato hex (ej. 00-11-22 o AA BB CC)
        // Buscamos patrones de volcado hexadecimal
        const hexMatch = clean.match(/^([0-9a-fA-F]{2}[- ]){3,}/);
        if (hexMatch) {
            // Limpiar y consolidar hex
            const hexLine = clean.replace(/[- ]/g, '').substring(0, 32); // Quedarse solo con los bytes
            currentHex += hexLine;
        } else {
            if (currentHex.length > 0) {
                const asciiText = Buffer.from(currentHex, 'hex').toString('utf-8');
                if (asciiText.includes('P|') || asciiText.includes('R|') || asciiText.includes('QC')) {
                    processASTMFrame(asciiText, 'PKTMON').catch(err => {
                        console.error(`[!] Error procesando trama pktmon:`, err.message);
                    });
                }
                currentHex = '';
            }
        }
    }
}

// ---------------------------------------------------------
// PROCESAMIENTO Y ENVÍO A CONTROLAB IA
// ---------------------------------------------------------
async function processASTMFrame(frame, engineName) {
    const isQC = frame.includes('QC') || frame.includes('|C|');
    const records = frame.split('\r');
    
    let testName = null;
    let patientId = null;

    for (let record of records) {
        const cleanRecord = record.trim();
        if (cleanRecord.startsWith('P|')) {
            const parts = cleanRecord.split('|');
            if (parts.length > 2) patientId = parts[2].trim();
        }
        if (cleanRecord.startsWith('R|')) {
            const parts = cleanRecord.split('|');
            if (parts.length > 2) {
                const testParts = parts[2].split('^');
                testName = testParts[0].trim();
            }
        }
    }

    // Mapeo rápido fallback si no viene estructurado
    if (!testName) {
        if (frame.includes('GLU')) testName = 'GLU';
        else if (frame.includes('UREA')) testName = 'UREA';
        else if (frame.includes('CREA')) testName = 'CREA';
        else if (frame.includes('COL')) testName = 'COL';
    }

    if (testName) {
        const payload = {
            raw_frame: frame,
            test_name: testName,
            patient_id: patientId || 'UNKNOWN',
            is_qc: isQC,
            timestamp: new Date().toISOString()
        };

        try {
            await axios.post(CONTROLAB_API_URL, payload);
            console.log(`[IA] [${engineName}] ☑ Trama interceptada y registrada: ${testName} (QC: ${isQC}, Paciente: ${payload.patient_id})`);
        } catch (error) {
            console.error(`[IA] [${engineName}] ❌ Error al registrar en Controlab: ${error.message}`);
        }
    }
}
