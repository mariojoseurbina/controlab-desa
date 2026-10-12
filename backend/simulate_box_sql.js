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

    const result = await prisma.$executeRawUnsafe(`
      INSERT INTO LotesReactivos (
        InventarioId, NumeroLote, FechaVencimiento, CantidadInicial, 
        CantidadActual, CodigoBarras, Marca, PruebasPorFrasco, 
        TotalFrascos, FrascoActual, PruebasRestantesFrascoActual, 
        estado_transferencia, almacen_origen_id, almacen_destino_id, 
        usuario_despacho, fecha_despacho
      ) VALUES (
        ${item.id}, 'SIM-' + CAST(ABS(CHECKSUM(NEWID()) % 100000) AS VARCHAR), GETDATE() + 365, 100, 
        100, '017791778040338410LDK9999', 'Wiener', 100, 
        1, 0, 0, 
        'EN_TRANSITO_LAB', 1, 2, 
        'Simulador AI', GETDATE()
      )
    `);

    console.log('✅ Caja simulada creada exitosamente mediante SQL Crudo para el producto: ' + item.nombre);
  } catch (error) {
    console.error('Error creando caja simulada:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}
run();
