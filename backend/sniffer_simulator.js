const fs = require('fs');
const path = require('path');
const http = require('http');

const watchDir = 'C:\\hl7_in';

// Crear directorio si no existe
if (!fs.existsSync(watchDir)){
    fs.mkdirSync(watchDir, { recursive: true });
}

console.log(`=================================================`);
console.log(`🤖 SIMULADOR DEL SNIFFER ACTIVO`);
console.log(`=================================================`);
console.log(`Esperando archivos (.txt, .hl7) en: ${watchDir}`);
console.log(`(Para probar, arrastra o crea un archivo allí)`);
console.log(`=================================================\n`);

fs.watch(watchDir, (eventType, filename) => {
    if (eventType === 'rename' && filename) {
        const filePath = path.join(watchDir, filename);
        if (fs.existsSync(filePath)) {
            console.log(`[${new Date().toLocaleTimeString()}] Archivo detectado: ${filename}`);
            
            // Esperar un poco para asegurar que el archivo terminó de escribirse
            setTimeout(() => {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    let test_name = 'TEST_SIMULADO';
                    let patient_id = 'PAT-1234';
                    
                    if (content.includes('GLUCOSA') || content.includes('GLUC')) test_name = 'GLUC - REACTIVO GLUCOSA';
                    else if (content.includes('UREA')) test_name = 'UREA - REACTIVO UREA';
                    else if (content.includes('COLESTEROL')) test_name = 'COL- REACTIVO COLESTEROL';

                    const payload = JSON.stringify({
                        raw_frame: content,
                        test_name: test_name,
                        patient_id: patient_id,
                        is_qc: false,
                        timestamp: new Date().toISOString()
                    });

                    const req = http.request({
                        hostname: 'localhost',
                        port: 5000,
                        path: '/api/sniffer/webhook',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(payload)
                        }
                    }, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            console.log(`✅ Datos enviados al cerebro. Respuesta: ${data}`);
                            // Eliminar archivo después de procesar
                            fs.unlinkSync(filePath);
                            console.log(`🗑️ Archivo ${filename} procesado y eliminado.\n`);
                        });
                    });

                    req.on('error', (e) => {
                        console.error(`❌ Error al conectar con el servidor: ${e.message}`);
                    });

                    req.write(payload);
                    req.end();

                } catch (err) {
                    console.error(`Error procesando archivo ${filename}:`, err.message);
                }
            }, 500); // 500ms delay
        }
    }
});
