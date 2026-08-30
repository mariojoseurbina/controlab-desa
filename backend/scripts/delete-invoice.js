const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const factura = '101010';
  console.log(`🗑️ Buscando y eliminando la factura: ${factura}...`);
  try {
    const res = await prisma.compras_inventario.deleteMany({
      where: { numero_factura: factura }
    });
    console.log(`✅ ¡Eliminado con éxito! Se borraron ${res.count} registros de la factura ${factura}.`);
  } catch (err) {
    console.error('❌ Error eliminando la factura:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
