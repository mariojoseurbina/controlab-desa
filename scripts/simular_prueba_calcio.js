const http = require('http');

function sendPost(urlStr, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
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

async function simularPruebaCalcio(numMuestra, equipo = 'CM 260i') {
  const patientId = `PAC-CAL-${String(numMuestra).padStart(3, '0')}`;
  console.log(`\n🧪 [Simulador] Enviando corrida de CALCIO para Paciente: ${patientId} en Equipo: ${equipo}...`);

  const hl7Frame = `MSH|^~\\&|CM260|LAB|HOST|LAB|${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}||ORU^R01|MSG000${numMuestra}|P|2.3.1\rPID|1||${patientId}||GARCIA^MARIA||19850512|F\rOBR|1||ORD000${numMuestra}|CA^CALCIO^LN|||${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}\rOBX|1|NM|CAAIII^CALCIO|1|9.4|mg/dL|8.5-10.5|N|||F`;

  try {
    const res = await sendPost('http://localhost:5000/api/sniffer/webhook', {
      test_name: 'CAAIII',
      patient_id: patientId,
      raw_frame: hl7Frame,
      equipo_origen: equipo === 'CM 260i' ? '192.168.10.188' : '192.168.30.148',
      is_qc: false,
      is_calibracion: false,
      is_repeticion: false,
      timestamp: new Date().toISOString()
    });

    console.log('Status HTTP:', res.status);
    console.log('📬 Respuesta del Backend:', res.data?.message || res.data);
    console.log('📊 Datos procesados:', res.data?.data);
    return res.data;
  } catch (error) {
    console.error('❌ Error enviando prueba:', error.message);
  }
}

async function run() {
  const args = process.argv.slice(2);
  const count = parseInt(args[0]) || 1;
  const equipo = args[1] || 'CM 260i';

  for (let i = 1; i <= count; i++) {
    await simularPruebaCalcio(i, equipo);
    if (i < count) {
      await new Promise(r => setTimeout(r, 600));
    }
  }
}

run();
