const http = require('http');

const data = JSON.stringify({
  nombre: 'Proveedor Test 123'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/compras/proveedores',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Body:', body);
  });
});

req.on('error', (error) => {
  console.error('Error with request:', error);
});

req.write(data);
req.end();
