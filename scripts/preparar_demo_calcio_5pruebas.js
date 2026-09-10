const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function prepararEscenario() {
  console.log('===============================================================');
  console.log('🎯 CONFIGURANDO ESCENARIO DE DEMOSTRACIÓN: CALCIO 2 FRASCOS');
  console.log('   Frasco 1 → 5 pruebas → Transición a Frasco 2');
  console.log('   Frasco 2 → 5 pruebas → Caja Agotada → Activar Caja 2');
  console.log('===============================================================');

  // 1. Limpiar logs previos de sniffer para estos lotes de prueba
  const lotesPrevios = await prisma.lotesReactivos.findMany({
    where: { NumeroLote: { in: ['LOT-CA-TEST-01', 'LOT-CA-TEST-02'] } },
    select: { Id: true }
  });
  const ids = lotesPrevios.map(l => l.Id);
  if (ids.length > 0) {
    await prisma.logSniffer.deleteMany({
      where: { lote_afectado_id: { in: ids } }
    });
    await prisma.lotesReactivos.deleteMany({
      where: { Id: { in: ids } }
    });
    console.log(`🗑️  Limpiados ${ids.length} lote(s) anteriores y sus logs.`);
  }

  // 2. CAJA 1: 2 frascos × 1.25 mL = 2.50 mL total (10 pruebas)
  //    - Frasco Actual: 1 (en uso)
  //    - Vol restante al inicio: 2.50 mL (ambos frascos intactos)
  const metaCaja1 = {
    frasco_actual: 1,          // Frasco en uso ahora
    total_frascos: 2,          // Esta caja tiene 2 frascos
    vol_por_frasco: 1.25,      // 1.25 mL = 5 pruebas por frasco
    volumen_total_caja: 2.50,  // Total de la caja = 2 frascos × 1.25 mL
    consumo_indicado: 0.25,    // 0.25 mL por prueba (Calcio)
    pruebas_por_frasco: 5,     // 5 pruebas exactas por frasco
    pruebas_por_caja: 10,      // 10 pruebas totales en la caja
    equipo_asociado: 'CM 260i',
    fecha_apertura_frasco_1: new Date().toISOString(),
    frasco_2_disponible: true,
    frasco_2_abierto: false
  };

  const caja1 = await prisma.lotesReactivos.create({
    data: {
      InventarioId: 17513,
      NumeroLote: 'LOT-CA-TEST-01',
      FechaFabricacion: new Date('2026-01-01'),
      FechaVencimiento: new Date('2027-12-31'),
      CantidadInicial: 2.50,    // 2 frascos × 1.25 mL
      CantidadActual: 2.50,     // Ambos frascos intactos al inicio
      ConsumoPorPrueba: 0.25,
      ReactivoPorPrueba: 0.25,
      PruebasTeoricas: 10,      // 10 pruebas totales (2 frascos × 5)
      PruebasRestantes: 10,
      Estado: 'Activo',
      FechaApertura: new Date(),
      UsuarioApertura: 'Bioanalista (Demo Inventario)',
      CondicionesEspeciales: JSON.stringify(metaCaja1)
    }
  });

  // 3. CAJA 2: Cerrada en Nevera - capacidad real (2 frascos × 55 mL = 110 mL)
  const metaCaja2 = {
    frasco_actual: 0,
    total_frascos: 2,
    vol_por_frasco: 55.0,
    volumen_total_caja: 110.0,
    consumo_indicado: 0.25,
    pruebas_por_frasco: 220,
    pruebas_por_caja: 440,
    equipo_asociado: 'CM 260i',
    frasco_2_disponible: true,
    frasco_2_abierto: false
  };

  const caja2 = await prisma.lotesReactivos.create({
    data: {
      InventarioId: 17513,
      NumeroLote: 'LOT-CA-TEST-02',
      FechaFabricacion: new Date('2026-01-01'),
      FechaVencimiento: new Date('2027-12-31'),
      CantidadInicial: 110.00,
      CantidadActual: 110.00,
      ConsumoPorPrueba: 0.25,
      ReactivoPorPrueba: 0.25,
      PruebasTeoricas: 440,
      PruebasRestantes: 440,
      Estado: 'Activo',
      FechaApertura: null,       // CERRADA en nevera
      UsuarioApertura: null,
      CondicionesEspeciales: JSON.stringify(metaCaja2)
    }
  });

  console.log('');
  console.log('✅ CAJA 1 (En Uso - Equipo CM 260i):');
  console.log(`   Lote : ${caja1.NumeroLote} (ID: ${caja1.Id})`);
  console.log(`   Stock: 2.50 mL | 10 Pruebas | 2 Frascos`);
  console.log(`   Frasco actual: 1 de 2 → quedan 5 pruebas en este frasco`);
  console.log('');
  console.log('✅ CAJA 2 (Cerrada en Nevera):');
  console.log(`   Lote : ${caja2.NumeroLote} (ID: ${caja2.Id})`);
  console.log(`   Stock: 110.00 mL | 440 Pruebas | 2 Frascos`);
  console.log('');
  console.log('📋 FLUJO DE DEMOSTRACIÓN:');
  console.log('   Paso 1: Sniffer corre 5 pruebas → Frasco 1 agota (0 mL en Frasco 1)');
  console.log('   Paso 2: Sistema notifica → Bioanalista monta Frasco 2');
  console.log('   Paso 3: Sniffer corre 5 pruebas más → Frasco 2 agota → Caja 1 = Agotada');
  console.log('   Paso 4: Escanear código LOT-CA-TEST-02 → Caja 2 pasa a En Uso');
  console.log('===============================================================');

  await prisma.$disconnect();
}

prepararEscenario().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
