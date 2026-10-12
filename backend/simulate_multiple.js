const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const item = await prisma.itemInventario.findFirst({
      where: { activo: true }
    });

    if (!item) {
      console.log('No hay items en el inventario para asociar la caja.');
      return;
    }

    const cajasCreadas = [];
    for (let i = 0; i < 5; i++) {
      const nuevaCaja = await prisma.lotesReactivos.create({
        data: {
          InventarioId: item.id,
          NumeroLote: 'MASIVO-' + Math.floor(Math.random() * 100000),
          FechaFabricacion: new Date(),
          FechaVencimiento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          CantidadInicial: 100,
          CantidadActual: 100,
          Estado: 'CERRADA',
          // Campos Trazabilidad Logística
          estado_transferencia: 'EN_TRANSITO_LAB',
          almacen_origen_id: 1,
          almacen_destino_id: 2,
          usuario_despacho: 'Simulador AI',
          fecha_despacho: new Date()
        }
      });
      cajasCreadas.push(nuevaCaja.NumeroLote);
    }

    console.log('✅ ' + cajasCreadas.length + ' cajas simuladas en tránsito creadas exitosamente para el producto: ' + item.nombre);
    console.log('Lotes: ' + cajasCreadas.join(', '));
  } catch (error) {
    console.error('Error creando cajas simuladas:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}
run();
