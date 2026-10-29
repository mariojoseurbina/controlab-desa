const fs = require('fs');
const path = require('path');

console.log('🔄 [ROLLBACK AUTOMÁTICO] Restaurando reglas de negocio a la versión sagrada del dueño...');

const goldPath = path.join(__dirname, '../src/core/gold_master/cajas.service.gold.js');
const targetPath = path.join(__dirname, '../src/modules/cajas/cajas.service.js');

if (!fs.existsSync(goldPath)) {
  console.error('❌ Error fatal: No se encontró la copia Gold Master en ' + goldPath);
  process.exit(1);
}

const goldContent = fs.readFileSync(goldPath, 'utf8');
fs.writeFileSync(targetPath, goldContent, 'utf8');

console.log('✅ cajas.service.js restaurado con éxito al 100% de la versión aprobada.');
console.log('✅ Sustitución de cajas, Kárdex, debito en almacén y exclusividad de canal restaurados.');
