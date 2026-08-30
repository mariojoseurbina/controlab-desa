const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const code = 'PLAST-012';
  console.log(`🔎 Verificando stock del producto: ${code}...`);
  
  const item = await prisma.itemInventario.findFirst({
    where: { codigo: code }
  });

  if (!item) {
    console.log('❌ Producto no encontrado.');
    return;
  }

  console.log(`\n📦 Producto en items_inventario (Ficha Global):`);
  console.log(`- ID: ${item.id}`);
  console.log(`- Código: ${item.codigo}`);
  console.log(`- Nombre: ${item.nombre}`);
  console.log(`- Stock Global Acumulado (stock_actual): ${item.stock_actual}`);

  console.log(`\n🏢 Desglose de Stock por Almacén (stock_por_almacen):`);
  const stocks = await prisma.stockPorAlmacen.findMany({
    where: { item_id: item.id },
    include: { almacen: true }
  });

  if (stocks.length === 0) {
    console.log('⚠️ No hay registros de stock por almacén para este producto.');
  } else {
    stocks.forEach(s => {
      console.log(`- Almacén: ${s.almacen.nombre} (ID: ${s.almacen_id}) | Stock Actual: ${s.stock_actual}`);
    });
  }

  console.log(`\n📋 Últimos 5 movimientos del producto:`);
  const movements = await prisma.movimientoInventario.findMany({
    where: { item_id: item.id },
    orderBy: { fecha_movimiento: 'desc' },
    take: 5,
    include: {
      almacen: { select: { nombre: true } },
      almacen_destino: { select: { nombre: true } }
    }
  });

  movements.forEach(m => {
    console.log(`- Tipo: ${m.tipo_movimiento} | Cantidad: ${m.cantidad} | Origen: ${m.almacen?.nombre || 'N/A'} | Destino: ${m.almacen_destino?.nombre || 'N/A'} | Fecha: ${m.fecha_movimiento}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
