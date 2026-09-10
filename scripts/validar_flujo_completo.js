const http = require('http');
const jwt = require('../backend/node_modules/jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '074726ceedfcbcc82c5f58ba1a80ea67acbbe1b6757889b222f8b55f7d19b2fb';
const authToken = jwt.sign({ id: 1, usuario: 'admin', rol: 'ADMIN', nombre_completo: 'Administrador Demo' }, JWT_SECRET, { expiresIn: '1h' });

function sendPost(urlStr, data, auth = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const postData = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    };
    if (auth) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (_) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function sendGet(urlStr, auth = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const headers = {};
    if (auth) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (_) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function simularPasoAPaso() {
  console.log('====================================================================');
  console.log('🧪 INICIANDO SIMULACIÓN DE 10 PRUEBAS DE CALCIO (2 FRASCOS) + ACTIVACIÓN POR SCAN');
  console.log('====================================================================\n');

  // PASO 1: Correr 5 pruebas de Calcio para agotar Frasco 1 (primer frasco)
  let loteId = null;
  for (let i = 1; i <= 5; i++) {
    const patientId = `PAC-DEMO-00${i}`;
    const hl7Frame = `MSH|^~\\&|CM260|LAB|HOST|LAB|${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}||ORU^R01|MSG000${i}|P|2.3.1\rPID|1||${patientId}||PACIENTE^DEMO_${i}||19900101|M\rOBR|1||ORD000${i}|CA^CALCIO^LN|||${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}\rOBX|1|NM|CAAIII^CALCIO|1|9.5|mg/dL|8.5-10.5|N|||F`;
    console.log(`▶️ [Prueba ${i}/10] Enviando corrida HL7 para Paciente: ${patientId}...`);
    const res = await sendPost('http://localhost:5000/api/sniffer/webhook', {
      test_name: 'CAAIII',
      patient_id: patientId,
      raw_frame: hl7Frame,
      equipo_origen: '192.168.10.188'
    });
    console.log(`   ↳ Mensaje: ${res.data.message}`);
    loteId = res.data.data.lote_id; // Guardar lote para uso posterior
    await new Promise(r => setTimeout(r, 200));
  }

  // PASO 2: Activar segundo frasco del mismo lote
  console.log('\n🔄 [Transición] Agotado Frasco 1 → Activando Frasco 2 del mismo lote');
  const resFrasco = await sendPost('http://localhost:5000/api/cajas/siguiente-frasco', {
    loteId,
    usuarioNombre: 'Bioanalista (Demo Transition)'
  }, true);
  console.log(`   ↳ Resultado: ${resFrasco.data.message}`);

  // PASO 3: Correr 5 pruebas adicionales (6-10) consumiendo del segundo frasco
  for (let i = 6; i <= 10; i++) {
    const patientId = `PAC-DEMO-00${i}`;
    const hl7Frame = `MSH|^~\\&|CM260|LAB|HOST|LAB|${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}||ORU^R01|MSG000${i}|P|2.3.1\rPID|1||${patientId}||PACIENTE^DEMO_${i}||19900101|F\rOBR|1||ORD000${i}|CA^CALCIO^LN|||${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}\rOBX|1|NM|CAAIII^CALCIO|1|9.8|mg/dL|8.5-10.5|N|||F`;
    console.log(`▶️ [Prueba ${i}/10] Enviando corrida HL7 para Paciente: ${patientId}...`);
    const res = await sendPost('http://localhost:5000/api/sniffer/webhook', {
      test_name: 'CAAIII',
      patient_id: patientId,
      raw_frame: hl7Frame,
      equipo_origen: '192.168.10.188'
    });
    console.log(`   ↳ Mensaje: ${res.data.message}`);
    await new Promise(r => setTimeout(r, 200));
  }

  // PASO 4: Verificar estado final de las cajas
  console.log('\n📊 Consultando estado final en el Centro de Control de Reactivos...');
  const resFinal = await sendGet('http://localhost:5000/api/cajas/laboratorio', true);
  const payload = resFinal.data.data;
  console.log('   - Cajas en Uso (Calcio):', (payload.cajasEnUso || []).filter(c => c.numeroLote.includes('LOT-CA-')).map(c => ({ lote: c.numeroLote, mlRestantesCaja: c.mlRestantesCaja, mlRestantesFrasco: c.mlRestantesFrasco, pruebasHoy: c.pruebasConsumidasHoy })));
  console.log('   - Cajas Agotadas (Calcio):', (payload.cajasAgotadas || []).filter(c => c.numeroLote.includes('LOT-CA-')).map(c => ({ lote: c.numeroLote, mlRestantes: c.mlRestantesCaja, estado: c.estado })));
  console.log('====================================================================\n');
}

simularPasoAPaso().catch(err => {
  console.error(err);
  process.exit(1);
});
