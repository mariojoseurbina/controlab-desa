const http = require('http');

function sendReq(path, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const postData = data ? JSON.stringify(data) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: postData ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      } : {}
    }, (res) => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch (_) {
          resolve({ status: res.statusCode, body: b });
        }
      });
    });
    if (postData) req.write(postData);
    req.end();
  });
}

async function check() {
  console.log('--- TEST /api/cajas/laboratorio ---');
  const r1 = await sendReq('/api/cajas/laboratorio');
  console.log('STATUS:', r1.status);
  console.log('BODY:', JSON.stringify(r1.body, null, 2));

  console.log('--- TEST /api/cajas/escanear ---');
  const r2 = await sendReq('/api/cajas/escanear', 'POST', {
    barcode: 'LOT-CA-TEST-02',
    equipo: 'CM 260i',
    usuarioNombre: 'Bioanalista'
  });
  console.log('STATUS:', r2.status);
  console.log('BODY:', JSON.stringify(r2.body, null, 2));
}

check();
