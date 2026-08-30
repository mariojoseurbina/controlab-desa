const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AlmacenesService {
  async listarAlmacenes() {
    return await prisma.almacen.findMany({
      where: { activo: true },
      orderBy: { id: 'asc' }
    });
  }

  async obtenerAlmacenPorId(id) {
    const item = await prisma.almacen.findUnique({
      where: { id: parseInt(id) }
    });
    if (!item) {
      throw new Error('Almacén no encontrado');
    }
    return item;
  }

  async crearAlmacen(data) {
    const { nombre, descripcion } = data;
    if (!nombre) {
      throw new Error('El nombre del almacén es requerido');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Crear almacén
      const almacen = await tx.almacen.create({
        data: {
          nombre,
          descripcion,
          activo: true
        }
      });

      // 2. Inicializar stock en 0 para todos los ítems de inventario existentes
      const items = await tx.itemInventario.findMany({
        select: { id: true }
      });

      if (items.length > 0) {
        const stockData = items.map(item => ({
          item_id: item.id,
          almacen_id: almacen.id,
          stock_actual: 0
        }));

        // Insertar registros de stock en lote
        await tx.stockPorAlmacen.createMany({
          data: stockData
        });
      }

      return almacen;
    });
  }
}

module.exports = new AlmacenesService();
