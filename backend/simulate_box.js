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

    const nuevaCaja = await prisma.lotesReactivos.create({
      data: {
        InventarioId: item.id,
        NumeroLote: 'SIM-' + Math.floor(Math.random() * 100000),
        FechaVencimiento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // +1 año
        FechaFabricacion: new Date(),
        CantidadInicial: 100,
        CantidadActual: 100,
        CostoUnitario: 50.00,
        CostoTotal: 50.00,
        CodigoBarras: '017791778040338410LDK' + Math.floor(Math.random() * 10000),
        Marca: 'Wiener',
        PruebasPorFrasco: 100,
        TotalFrascos: 1,
        FrascoActual: 0,
        PruebasRestantesFrascoActual: 0,
        estatus: 'CERRADA',
        estado_transferencia: 'EN_TRANSITO_LAB',
        almacen_origen_id: 1,
        almacen_destino_id: 2,
        usuario_despacho: 'Simulador AI',
        fecha_despacho: new Date()
      }
    });

    console.log('✅ Caja simulada creada exitosamente: Lote ' + nuevaCaja.NumeroLote + ' para el producto: ' + item.nombre);
  } catch (error) {
    console.error('Error creando caja simulada:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}
run();
