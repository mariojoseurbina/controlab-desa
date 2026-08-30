const http = require('http');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const EQUIPOS = [
    { id: 1, name: 'CLIA CL 900 (Inmunologia)', ip: '192.168.1.50', tests: ['TSH'] },
    { id: 2, name: 'BS 230 Mindray (Quimica)', ip: '192.168.1.51', tests: ['GLUCOSA', 'UREA', 'COLESTEROL', 'ACIDO URICO'] },
    { id: 3, name: 'BC 5000 Mindray (Hematologia)', ip: '192.168.1.52', tests: ['HEMOGRAMA'] },
    { id: 4, name: 'BC 5380 Mindray (Hematologia)', ip: '192.168.1.53', tests: ['HEMOGRAMA'] },
    { id: 5, name: 'CA 500 Sysmex (Coagulacion)', ip: '192.168.1.54', tests: ['TP'] }
];

const TIPOS = [
    { id: 1, name: 'Paciente Normal (PAC-777)', is_qc: false, is_cal: false, is_rep: false, pid: 'PAC-777' },
    { id: 2, name: 'Control de Calidad (QC_LEVEL_1)', is_qc: true, is_cal: false, is_rep: false, pid: 'QC_LEVEL_1' },
    { id: 3, name: 'Calibrador (CALIB_STD)', is_qc: false, is_cal: true, is_rep: false, pid: 'CALIB_STD' },
    { id: 4, name: 'Repetición (Muestra repetida en corto tiempo)', is_qc: false, is_cal: false, is_rep: true, pid: 'PAC-REP-999' }
];

function mostrarMenuEquipos() {
    console.clear();
    console.log("====================================================");
    console.log("🤖 SIMULADOR MULTIEQUIPO - CONTROLAB IA (DESARROLLO)");
    console.log("====================================================");
    console.log("Seleccione el Analizador Clínico a Simular:");
    EQUIPOS.forEach(e => console.log(`${e.id}. ${e.name} [IP: ${e.ip}]`));
    console.log("6. Salir");
    console.log("====================================================");
    rl.question("Elija una opción (1-6): ", (opcion) => {
        const id = parseInt(opcion);
        if (id === 6) {
            rl.close();
            process.exit(0);
        }
        const equipo = EQUIPOS.find(e => e.id === id);
        if (equipo) {
            mostrarMenuPruebas(equipo);
        } else {
            console.log("Opción inválida.");
            setTimeout(mostrarMenuEquipos, 1500);
        }
    });
}

function mostrarMenuPruebas(equipo) {
    console.log("\n----------------------------------------------------");
    console.log(`Pruebas disponibles para ${equipo.name}:`);
    equipo.tests.forEach((t, idx) => console.log(`${idx + 1}. ${t}`));
    console.log("----------------------------------------------------");
    rl.question(`Elija la prueba (1-${equipo.tests.length}): `, (opcionTest) => {
        const testIdx = parseInt(opcionTest) - 1;
        const test = equipo.tests[testIdx];
        if (test) {
            mostrarMenuTipos(equipo, test);
        } else {
            console.log("Prueba inválida.");
            setTimeout(() => mostrarMenuPruebas(equipo), 1500);
        }
    });
}

function mostrarMenuTipos(equipo, test) {
    console.log("\n----------------------------------------------------");
    console.log("Seleccione el Tipo de Corrida/Simulación:");
    TIPOS.forEach(t => console.log(`${t.id}. ${t.name}`));
    console.log("----------------------------------------------------");
    rl.question("Elija una opción (1-4): ", (opcionTipo) => {
        const tipoId = parseInt(opcionTipo);
        const tipo = TIPOS.find(t => t.id === tipoId);
        if (tipo) {
            if (tipo.is_rep) {
                ejecutarSimulacionRepeticion(equipo, test, tipo);
            } else {
                ejecutarSimulacion(equipo, test, tipo);
            }
        } else {
            console.log("Tipo inválido.");
            setTimeout(() => mostrarMenuTipos(equipo, test), 1500);
        }
    });
}

function enviarTrama(payload) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(payload);

        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/sniffer/webhook',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ success: false, message: 'Respuesta no es JSON válida', raw: data });
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

async function ejecutarSimulacion(equipo, test, tipo) {
    console.log("\n📡 Generando y enviando trama del equipo...");

    const payload = {
        raw_frame: `MSH|^~\\&|${equipo.name}||LIMS||${new Date().toISOString()}||ORU^R01||P|2.3\nPID|||${tipo.pid}||Paciente^Prueba||||\nOBR||||${test}|||||||||||||||`,
        test_name: test,
        patient_id: tipo.pid,
        is_qc: tipo.is_qc,
        is_calibracion: tipo.is_cal,
        is_repeticion: tipo.is_rep,
        equipo_origen: equipo.name,
        timestamp: new Date().toISOString()
    };

    try {
        const res = await enviarTrama(payload);
        console.log("\n====================================================");
        console.log("📥 RESPUESTA DEL SERVIDOR CONTROLAB IA:");
        console.log("====================================================");
        console.log(`Estado: ${res.success ? '✅ EXITO' : '❌ ERROR'}`);
        console.log(`Mensaje: ${res.message}`);
        if (res.data) {
            console.log(`Corrida Identificada Como: [${res.data.tipo_prueba}]`);
            console.log(`¿Descuento Realizado?: ${res.data.descuento ? 'SÍ, en lote' : 'NO'}`);
            if (res.data.descuento) {
                console.log(`Lote Afectado ID: ${res.data.lote_id}`);
                console.log(`Volumen Descontado: ${res.data.ml_descontados} ml`);
            }
        }
        console.log("====================================================");
    } catch (err) {
        console.log(`❌ Error al conectar con el backend: ${err.message}`);
    }

    rl.question("\nPresione ENTER para volver al menú...", () => {
        mostrarMenuEquipos();
    });
}

async function ejecutarSimulacionRepeticion(equipo, test, tipo) {
    console.log("\n📡 Enviando la PRIMERA prueba de la muestra...");
    
    // Primera petición (Paciente normal)
    const payload1 = {
        raw_frame: `MSH|^~\\&|${equipo.name}||LIMS||${new Date().toISOString()}||ORU^R01||P|2.3\nPID|||${tipo.pid}||Paciente^Repeticion||||\nOBR||||${test}|||||||||||||||`,
        test_name: test,
        patient_id: tipo.pid,
        is_qc: false,
        is_calibracion: false,
        is_repeticion: false,
        equipo_origen: equipo.name
    };

    try {
        const res1 = await enviarTrama(payload1);
        console.log(`-> Primera prueba: ${res1.message}`);

        console.log("\n⏳ Esperando 2 segundos para simular repetición inmediata...");
        await new Promise(r => setTimeout(r, 2000));

        console.log("📡 Enviando la SEGUNDA prueba (Repetición)...");
        // Segunda petición (La misma muestra en menos de 10 min)
        const res2 = await enviarTrama(payload1); // Mismo payload, el backend debe auto-detectar que es repetición

        console.log("\n====================================================");
        console.log("📥 RESPUESTA DE LA REPETICION AUTO-DETECTADA:");
        console.log("====================================================");
        console.log(`Estado: ${res2.success ? '✅ EXITO' : '❌ ERROR'}`);
        console.log(`Mensaje: ${res2.message}`);
        if (res2.data) {
            console.log(`Corrida Identificada Como: [${res2.data.tipo_prueba}]`);
            console.log(`¿Descuento Realizado?: ${res2.data.descuento ? 'SÍ, en lote' : 'NO'}`);
            if (res2.data.descuento) {
                console.log(`Lote Afectado ID: ${res2.data.lote_id}`);
                console.log(`Volumen Descontado: ${res2.data.ml_descontados} ml`);
            }
        }
        console.log("====================================================");
    } catch (err) {
        console.log(`❌ Error en simulación de repetición: ${err.message}`);
    }

    rl.question("\nPresione ENTER para volver al menú...", () => {
        mostrarMenuEquipos();
    });
}

// Iniciar
mostrarMenuEquipos();
