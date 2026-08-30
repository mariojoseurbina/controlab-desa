const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando catálogo de Almacenes...');

  // 1. Crear almacenes por defecto
  const almacenesDefault = [
    { nombre: 'Almacén Central', descripcion: 'Depósito principal de reactivos y consumibles' },
    { nombre: 'Sucursal Chacao', descripcion: 'Laboratorio sucursal sede Chacao' },
    { nombre: 'Sucursal Las Mercedes', descripcion: 'Laboratorio sucursal sede Las Mercedes' }
  ];

  const almacenesCreados = [];
  for (const item of almacenesDefault) {
    let almacen = await prisma.almacen.findFirst({
      where: { nombre: item.nombre }
    });

    if (!almacen) {
      almacen = await prisma.almacen.create({
        data: item
      });
      console.log(`✅ Creado almacén: ${item.nombre}`);
    } else {
      console.log(`ℹ️ Ya existe el almacén: ${item.nombre}`);
    }
    almacenesCreados.push(almacen);
  }

  const central = almacenesCreados.find(a => a.nombre === 'Almacén Central');
  const chacao = almacenesCreados.find(a => a.nombre === 'Sucursal Chacao');
  const mercedes = almacenesCreados.find(a => a.nombre === 'Sucursal Las Mercedes');

  // 2. Migrar stock actual de items a los almacenes
  console.log('\n📦 Migrando stock actual de productos a Almacén Central...');
  const items = await prisma.itemInventario.findMany();

  let migrados = 0;
  for (const item of items) {
    const stockGlobal = Number(item.stock_actual) || 0;

    // Crear/actualizar stock para Almacén Central (con el stock actual del item)
    await prisma.stockPorAlmacen.upsert({
      where: {
        item_id_almacen_id: {
          item_id: item.id,
          almacen_id: central.id
        }
      },
      update: {},
      create: {
        item_id: item.id,
        almacen_id: central.id,
        stock_actual: stockGlobal,
        ubicacion: item.ubicacion || 'General'
      }
    });

    // Inicializar Sucursal Chacao en 0 si no existe
    await prisma.stockPorAlmacen.upsert({
      where: {
        item_id_almacen_id: {
          item_id: item.id,
          almacen_id: chacao.id
        }
      },
      update: {},
      create: {
        item_id: item.id,
        almacen_id: chacao.id,
        stock_actual: 0
      }
    });

    // Inicializar Sucursal Las Mercedes en 0 si no existe
    await prisma.stockPorAlmacen.upsert({
      where: {
        item_id_almacen_id: {
          item_id: item.id,
          almacen_id: mercedes.id
        }
      },
      update: {},
      create: {
        item_id: item.id,
        almacen_id: mercedes.id,
        stock_actual: 0
      }
    });

    migrados++;
  }

  console.log(`✅ Proceso finalizado. Se migraron stock para ${migrados} productos en 3 almacenes.`);
}

main()
  .catch(e => {
    console.error('❌ Error ejecutando seed de almacenes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
