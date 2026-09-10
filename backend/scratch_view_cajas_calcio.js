const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cajasService = require('./src/modules/cajas/cajas.service');

async function main() {
  const reporte = await cajasService.getCajasLaboratorio();
  console.log('--- RESUMEN CENTRO DE CONTROL DE CAJAS (CALCIO) ---');
  
  console.log('\n[1. CAJAS EN USO]:');
  console.table(reporte.cajasEnUso.filter(c => c.productoNombre.includes('CA-COLOR') || c.numeroLote.includes('LOT-CA-')).map(c => ({
    Lote: c.numeroLote,
    Producto: c.productoNombre,
    Equipo: c.equipoAsociado,
    Frasco: `${c.frascoActual}/${c.totalFrascos}`,
    'Pruebas Hoy': c.pruebasConsumidasHoy,
    'mL Consumidos': c.mlConsumidosTotal,
    'mL Restantes Frasco': c.mlRestantesFrasco,
    'Pruebas Restantes Frasco': c.pruebasRestantesFrasco,
    'mL Restantes Caja': c.mlRestantesCaja,
    'Estado': c.estado
  })));

  console.log('\n[2. CAJAS AGOTADAS / HISTORIAL]:');
  console.table(reporte.cajasAgotadas.filter(c => c.productoNombre.includes('CA-COLOR') || c.numeroLote.includes('LOT-CA-')).map(c => ({
    Lote: c.numeroLote,
    Producto: c.productoNombre,
    'Total Pruebas': c.pruebasConsumidasTotal,
    'Total mL Consumidos': c.mlConsumidosTotal,
    'Estado': c.estado
  })));

  console.log('\n[3. CAJAS CERRADAS EN ESPERA / NEVERA]:');
  console.table(reporte.cajasCerradas.filter(c => c.productoNombre.includes('CA-COLOR') || c.numeroLote.includes('LOT-CA-')).map(c => ({
    Lote: c.numeroLote,
    Producto: c.productoNombre,
    'Total Frascos': c.totalFrascos,
    'Volumen Caja': c.totalVolCaja + ' ml',
    'Pruebas Teóricas': c.pruebasPorCaja,
    'Estado': c.estado
  })));

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
