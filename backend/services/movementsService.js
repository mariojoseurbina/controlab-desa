const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auditService = require('./auditService');

class MovementsService {
  async getAllMovements(almacenId) {
    const where = {};
    if (almacenId && almacenId !== 'all') {
      where.OR = [
        { almacen_id: parseInt(almacenId) },
        { almacen_destino_id: parseInt(almacenId) }
      ];
    }

    const movements = await prisma.movimientoInventario.findMany({
      where,
      include: {
        almacen: { select: { nombre: true } },
        almacen_destino: { select: { nombre: true } }
      },
      orderBy: { fecha_movimiento: 'desc' }
    });

    // Cargar los items correspondientes
    const itemIds = [...new Set(movements.map(m => m.item_id))];
    const items = await prisma.itemInventario.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, nombre: true, codigo: true }
    });

    const itemMap = new Map(items.map(i => [i.id, i]));

    // Mapear al formato esperado por el frontend
    return movements.map(m => {
      const item = itemMap.get(m.item_id) || {};
      return {
        id: m.id,
        item_id: m.item_id,
        tipo_movimiento: m.tipo_movimiento,
        cantidad: Number(m.cantidad),
        stock_anterior: Number(m.stock_anterior),
        stock_nuevo: Number(m.stock_nuevo),
        motivo: m.motivo,
        referencia: m.referencia,
        fecha_movimiento: m.fecha_movimiento,
        creado_por: m.creado_por,
        almacen_id: m.almacen_id,
        almacen_destino_id: m.almacen_destino_id,
        item_nombre: item.nombre || 'N/A',
        item_codigo: item.codigo || 'N/A',
        almacen_nombre: m.almacen?.nombre || 'N/A',
        almacen_destino_nombre: m.almacen_destino?.nombre || 'N/A'
      };
    });
  }

  async createMovement(data, userId) {
    const { item_id, tipo_movimiento, cantidad, motivo, referencia, almacen_id } = data;

    if (!item_id || !tipo_movimiento || !cantidad || !almacen_id) {
      throw new Error('Todos los campos obligatorios (ítem, tipo, cantidad, almacén) deben ser completados');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Obtener stock anterior en la ubicación específica
      let stockRecord = await tx.stockPorAlmacen.findUnique({
        where: {
          item_id_almacen_id: {
            item_id: parseInt(item_id),
            almacen_id: parseInt(almacen_id)
          }
        }
      });

      const stock_anterior = stockRecord ? Number(stockRecord.stock_actual) : 0;
      const qty = parseFloat(cantidad);
      const stock_nuevo = tipo_movimiento === 'ENTRADA' ? stock_anterior + qty : stock_anterior - qty;

      if (stock_nuevo < 0) {
        throw new Error('Stock insuficiente en la ubicación seleccionada para realizar este egreso');
      }

      // 2. Actualizar stock por almacén
      await tx.stockPorAlmacen.upsert({
        where: {
          item_id_almacen_id: {
            item_id: parseInt(item_id),
            almacen_id: parseInt(almacen_id)
          }
        },
        update: { stock_actual: stock_nuevo },
        create: {
          item_id: parseInt(item_id),
          almacen_id: parseInt(almacen_id),
          stock_actual: stock_nuevo
        }
      });

      // 3. Recalcular y actualizar stock global acumulado en items_inventario
      const allStocks = await tx.stockPorAlmacen.findMany({
        where: { item_id: parseInt(item_id) }
      });
      const totalGlobalStock = allStocks.reduce((sum, s) => sum + Number(s.stock_actual), 0);

      await tx.itemInventario.update({
        where: { id: parseInt(item_id) },
        data: { stock_actual: totalGlobalStock }
      });

      // 4. Crear el registro del movimiento con almacén
      const movimiento = await tx.movimientoInventario.create({
        data: {
          item_id: parseInt(item_id),
          tipo_movimiento,
          cantidad: qty,
          stock_anterior,
          stock_nuevo,
          motivo,
          referencia,
          almacen_id: parseInt(almacen_id),
          creado_por: userId
        }
      });

      // Trazabilidad: REGISTRAR_MOVIMIENTO
      await auditService.logEvent(
        userId || 1,
        'REGISTRAR_MOVIMIENTO',
        'MOVIMIENTO',
        movimiento.id,
        {
          item_id,
          tipo_movimiento,
          cantidad: qty,
          almacen_id,
          motivo,
          stock_anterior,
          stock_nuevo
        }
      );

      return { success: true, message: 'Movimiento registrado exitosamente', data: movimiento };
    });
  }

  async transferStock(data, userId) {
    const { item_id, cantidad, almacen_origen_id, almacen_destino_id, motivo, referencia } = data;

    if (!item_id || !cantidad || !almacen_origen_id || !almacen_destino_id) {
      throw new Error('Parámetros de transferencia incompletos');
    }

    if (parseInt(almacen_origen_id) === parseInt(almacen_destino_id)) {
      throw new Error('El almacén de origen y destino no pueden ser iguales');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Validar y restar en almacén origen
      let stockOrigen = await tx.stockPorAlmacen.findUnique({
        where: {
          item_id_almacen_id: {
            item_id: parseInt(item_id),
            almacen_id: parseInt(almacen_origen_id)
          }
        }
      });

      const stock_anterior_origen = stockOrigen ? Number(stockOrigen.stock_actual) : 0;
      const qty = parseFloat(cantidad);

      if (stock_anterior_origen < qty) {
        throw new Error('Stock insuficiente en el almacén de origen para realizar la transferencia');
      }

      const stock_nuevo_origen = stock_anterior_origen - qty;

      await tx.stockPorAlmacen.upsert({
        where: {
          item_id_almacen_id: {
            item_id: parseInt(item_id),
            almacen_id: parseInt(almacen_origen_id)
          }
        },
        update: { stock_actual: stock_nuevo_origen },
        create: {
          item_id: parseInt(item_id),
          almacen_id: parseInt(almacen_origen_id),
          stock_actual: stock_nuevo_origen
        }
      });

      // 2. Sumar en almacén destino
      let stockDestino = await tx.stockPorAlmacen.findUnique({
        where: {
          item_id_almacen_id: {
            item_id: parseInt(item_id),
            almacen_id: parseInt(almacen_destino_id)
          }
        }
      });

      const stock_anterior_destino = stockDestino ? Number(stockDestino.stock_actual) : 0;
      const stock_nuevo_destino = stock_anterior_destino + qty;

      await tx.stockPorAlmacen.upsert({
        where: {
          item_id_almacen_id: {
            item_id: parseInt(item_id),
            almacen_id: parseInt(almacen_destino_id)
          }
        },
        update: { stock_actual: stock_nuevo_destino },
        create: {
          item_id: parseInt(item_id),
          almacen_id: parseInt(almacen_destino_id),
          stock_actual: stock_nuevo_destino
        }
      });

      // 3. Recalcular y actualizar stock global acumulado en items_inventario (debería quedar igual, pero asegura sincronización)
      const allStocks = await tx.stockPorAlmacen.findMany({
        where: { item_id: parseInt(item_id) }
      });
      const totalGlobalStock = allStocks.reduce((sum, s) => sum + Number(s.stock_actual), 0);

      await tx.itemInventario.update({
        where: { id: parseInt(item_id) },
        data: { stock_actual: totalGlobalStock }
      });

      const movimiento = await tx.movimientoInventario.create({
        data: {
          item_id: parseInt(item_id),
          tipo_movimiento: 'TRANSFERENCIA',
          cantidad: qty,
          stock_anterior: stock_anterior_origen,
          stock_nuevo: stock_nuevo_origen,
          motivo: motivo || 'Transferencia semanal de suministros',
          referencia: referencia || 'TRANSFERENCIA',
          almacen_id: parseInt(almacen_origen_id),
          almacen_destino_id: parseInt(almacen_destino_id),
          creado_por: userId
        }
      });

      // Trazabilidad: REGISTRAR_MOVIMIENTO para Transferencias
      await auditService.logEvent(
        userId || 1,
        'TRANSFERIR_INVENTARIO',
        'MOVIMIENTO',
        movimiento.id,
        {
          item_id,
          tipo_movimiento: 'TRANSFERENCIA',
          cantidad: qty,
          almacen_origen_id,
          almacen_destino_id,
          motivo,
          referencia
        }
      );

      return { success: true, message: 'Transferencia registrada exitosamente', data: movimiento };
    });
  }
}

module.exports = new MovementsService();
