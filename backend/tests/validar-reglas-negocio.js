const fs = require('fs');

function verificarReglasNegocio() {
  console.log('🔍 [SEGURIDAD CONTROLAB] Ejecutando verificación de Reglas de Negocio Inmutables...');

  let fallos = [];

  // 1. Verificar GEMINI.md
  const geminiPath = 'C:/controlab-desa/GEMINI.md';
  if (!fs.existsSync(geminiPath)) {
    fallos.push('Falta el archivo sagrado GEMINI.md en la raíz del proyecto.');
  } else {
    const geminiTxt = fs.readFileSync(geminiPath, 'utf8');
    if (!geminiTxt.includes('PROHIBICIÓN TOTAL DE AGENTES IA EN OPERACIONES TRANSACCIONALES')) {
      fallos.push('GEMINI.md fue alterado: falta la directiva de prohibición de agentes IA.');
    }
  }

  // 2. Verificar cajas.service.js
  const cajasPath = 'C:/controlab-desa/backend/src/modules/cajas/cajas.service.js';
  if (!fs.existsSync(cajasPath)) {
    fallos.push('No se encontró el archivo cajas.service.js');
  } else {
    const cajasCode = fs.readFileSync(cajasPath, 'utf8');

    // Regla: Exclusividad de Canal y Sustitución Automática
    if (!cajasCode.includes('SUSTITUCION_LOTE') || !cajasCode.includes('lotesPreviosActivos')) {
      fallos.push('REGLA CRÍTICA ROTA: La sustitución automática de cajas en cajas.service.js fue eliminada o comentada.');
    }

    // Regla: Descuento de stock en almacén de laboratorio (almacen_id = 2)
    if (!cajasCode.includes('stockLabNuevo') || !cajasCode.includes('almacen_id: 2')) {
      fallos.push('REGLA CRÍTICA ROTA: El débito de caja física en Almacén Laboratorio (almacen_id = 2) fue alterado.');
    }

    // Regla: Marcado a Agotado de la caja previa
    if (!cajasCode.includes("data: { Estado: 'Agotado' }")) {
      fallos.push('REGLA CRÍTICA ROTA: Falta la instrucción de cierre administrativo (Estado: Agotado) para cajas previas.');
    }
  }

  // 3. Verificar sniffer.controller.js
  const snifferPath = 'C:/controlab-desa/backend/src/modules/sniffer/sniffer.controller.js';
  if (!fs.existsSync(snifferPath)) {
    fallos.push('No se encontró el archivo sniffer.controller.js');
  } else {
    const snifferCode = fs.readFileSync(snifferPath, 'utf8');
    if (!snifferCode.includes('processBS230') || !snifferCode.includes("'40': ['CRP II'")) {
      fallos.push('REGLA CRÍTICA ROTA: La matriz de canales del Mindray BS-230 en sniffer.controller.js fue alterada.');
    }
  }

  if (fallos.length > 0) {
    console.error('\n🚨 =========================================================================');
    console.error('🚨 ALERTA CRÍTICA DE SEGURIDAD: REGLAS DE NEGOCIO CONTROLAB VIOLADAS');
    console.error('🚨 =========================================================================');
    fallos.forEach((f, i) => console.error(`  [${i + 1}] ${f}`));
    console.error('🚨 =========================================================================');
    console.error('💡 Para restaurar el sistema a la versión aprobada por el dueño ejecute:');
    console.error('   npm run restaurar-reglas\n');
    return false;
  }

  console.log('✅ [SEGURIDAD CONTROLAB] Todas las reglas de negocio verificadas e intactas.');
  return true;
}

if (require.main === module) {
  const ok = verificarReglasNegocio();
  process.exit(ok ? 0 : 1);
}

module.exports = { verificarReglasNegocio };
