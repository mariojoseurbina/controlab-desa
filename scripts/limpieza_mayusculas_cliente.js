/**
 * Script opcional para estandarizar en MAYÚSCULAS y eliminar caracteres corruptos
 * en la base de datos del cliente (ItemInventario y MovimientoInventario).
 * No altera existencias, números de stock ni identificadores.
 */
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

function normalizarTexto(texto) {
  if (!texto) return texto;
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0080-\u00ff]/g, '')
    .toUpperCase()
    .trim();
}

async function main() {
  console.log('Iniciando estandarización en mayúsculas de la base de datos...');

  // 1. Limpieza de marcas en ItemInventario
  const items = await prisma.itemInventario.findMany({
    select: { id: true, marca: true, nombre: true }
  });

  let countItems = 0;
  for (const item of items) {
    const nuevaMarca = normalizarTexto(item.marca);
    if (nuevaMarca !== item.marca) {
      await prisma.itemInventario.update({
        where: { id: item.id },
        data: { marca: nuevaMarca }
      });
      countItems++;
    }
  }
  console.log(`✓ Marcas estandarizadas en ${countItems} productos.`);

  // 2. Limpieza de motivos y referencias en MovimientoInventario
  const movimientos = await prisma.movimientoInventario.findMany({
    select: { id: true, motivo: true, referencia: true }
  });

  let countMovs = 0;
  for (const m of movimientos) {
    const nuevoMotivo = normalizarTexto(m.motivo);
    const nuevaRef = normalizarTexto(m.referencia);
    if (nuevoMotivo !== m.motivo || nuevaRef !== m.referencia) {
      await prisma.movimientoInventario.update({
        where: { id: m.id },
        data: {
          motivo: nuevoMotivo,
          referencia: nuevaRef
        }
      });
      countMovs++;
    }
  }
  console.log(`✓ Historial estandarizado en ${countMovs} movimientos.`);
  console.log('¡Limpieza completada con éxito sin afectar existencias!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
