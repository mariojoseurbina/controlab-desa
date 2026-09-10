const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cajasService = require('./src/modules/cajas/cajas.service');

async function main() {
  console.log('--- CONFIGURANDO LOTES DE PRUEBA DE CALCIO (WIENER LAB ID: 17513) ---');
  
  // Limpiar pruebas previas de Calcio si existían
  await prisma.lotesReactivos.deleteMany({
    where: {
      NumeroLote: { in: ['LOT-CA-TEST-01', 'LOT-CA-TEST-02'] }
    }
  });

  // 1. Caja 1: Abierta / En Uso con volumen reducido para probar agotamiento rápido (1.00 mL = 4 pruebas de 0.25 mL)
  const metaCaja1 = {
    frasco_actual: 1,
    total_frascos: 2,
    vol_por_frasco: 0.50,
    volumen_total_caja: 1.00,
    consumo_indicado: 0.25,
    pruebas_por_frasco: 2,
    pruebas_por_caja: 4,
    equipo_asociado: 'CM 260i',
    fecha_apertura_frasco_1: new Date().toISOString()
  };

  const caja1 = await prisma.lotesReactivos.create({
    data: {
      InventarioId: 17513,
      NumeroLote: 'LOT-CA-TEST-01',
      FechaFabricacion: new Date('2026-01-01'),
      FechaVencimiento: new Date('2027-12-31'),
      CantidadInicial: 1.00,
      CantidadActual: 1.00,
      ConsumoPorPrueba: 0.25,
      ReactivoPorPrueba: 0.25,
      PruebasTeoricas: 4,
      PruebasRestantes: 4,
      Estado: 'Activo',
      FechaApertura: new Date(),
      UsuarioApertura: 'Bioanalista (Prueba Controlab)',
      CondicionesEspeciales: JSON.stringify(metaCaja1)
    }
  });
  console.log('✅ Caja 1 Creada (En Uso - 1.00 mL / 4 Pruebas): ID =', caja1.Id);

  // 2. Caja 2: Cerrada en Nevera / Reserva (Volumen comercial completo: 2 frascos x 55 mL = 110 mL, 440 pruebas)
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
      FechaApertura: null, // CERRADA
      UsuarioApertura: null,
      CondicionesEspeciales: null
    }
  });
  console.log('✅ Caja 2 Creada (Cerrada en Nevera - 110 mL / 440 Pruebas): ID =', caja2.Id);

  // Consultar cómo se ve en el servicio de Cajas
  const reporte = await cajasService.getCajasLaboratorio();
  console.log('\n--- RESUMEN CENTRO DE CONTROL DE CAJAS ---');
  console.log('Cajas en Uso:', reporte.cajasEnUso.filter(c => c.productoNombre.includes('CA-COLOR') || c.numeroLote.includes('LOT-CA-')).map(c => ({ id: c.id, lote: c.numeroLote, producto: c.productoNombre, mlRestantes: c.mlRestantesCaja, estado: c.estado, frasco: `${c.frascoActual}/${c.totalFrascos}` })));
  console.log('Cajas Cerradas en Nevera:', reporte.cajasCerradas.filter(c => c.productoNombre.includes('CA-COLOR') || c.numeroLote.includes('LOT-CA-')).map(c => ({ id: c.id, lote: c.numeroLote, producto: c.productoNombre, mlRestantes: c.mlRestantesCaja, estado: c.estado })));

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
