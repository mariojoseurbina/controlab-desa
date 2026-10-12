var Service = require('node-windows').Service;
var path = require('path');

// Crea un nuevo objeto de servicio de Windows
var svc = new Service({
  name: 'Controlab IA Sniffer (CANS)',
  description: 'Microservicio TCP Proxy para la interceptación y auditoría de tráfico HL7/ASTM de analizadores médicos.',
  script: path.join(__dirname, 'server.js'),
  env: [{
    name: "INGRESS_PORT",
    value: "6001"
  },
  {
    name: "EGRESS_PORT",
    value: "5001"
  }]
});

// Escuchar el evento de instalación para iniciarlo automáticamente
svc.on('install', function() {
  console.log('✅ Servicio de Windows instalado correctamente.');
  console.log('Iniciando servicio de fondo...');
  svc.start();
});

// Manejar errores
svc.on('alreadyinstalled', function() {
  console.log('⚠️ El servicio ya está instalado.');
});

svc.on('start', function() {
  console.log('🚀 Servicio Controlab IA Sniffer arrancado con éxito.');
});

// Instalar el servicio
console.log('Iniciando instalación del servicio de Windows...');
svc.install();
