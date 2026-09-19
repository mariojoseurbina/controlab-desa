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

      if ((tipo_movimiento === 'SALIDA' || tipo_movimiento === 'MERMA') && (stock_anterior <= 0 || qty > stock_anterior)) {
        throw new Error(`REGLA DE CONTROL: La cantidad a egresar (${qty} cajas) NUNCA puede ser mayor al stock existente en el almacén (${stock_anterior} cajas).`);
      }

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

      if (stock_anterior_origen <= 0) {
        throw new Error(`REGLA DE CONTROL: El almacén de origen seleccionado posee 0 cajas disponibles de este producto. No se pueden realizar transferencias sin existencia previa.`);
      }

      if (qty > stock_anterior_origen) {
        throw new Error(`REGLA DE CONTROL: La cantidad a transferir (${qty} cajas) NUNCA puede ser mayor a la cantidad existente en el almacén de origen (${stock_anterior_origen} cajas).`);
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
  async cargaMasivaInicial(data, userId) {
    const { lotes, almacen_id, motivo } = data;

    if (!Array.isArray(lotes) || lotes.length === 0) {
      throw new Error('Debe proporcionar al menos un lote para la carga masiva.');
    }

    if (!almacen_id) {
      throw new Error('Debe especificar el almacén para la carga masiva.');
    }

    return await prisma.$transaction(async (tx) => {
      let totalCajas = 0;
      
      for (const loteData of lotes) {
        const { item_id, numero_lote, fecha_vencimiento, cantidad } = loteData;
        const qty = parseInt(cantidad, 10);

        if (!item_id || !numero_lote || !cantidad || qty <= 0) {
          throw new Error('Todos los lotes deben tener item_id, numero_lote y una cantidad válida mayor a cero.');
        }

        const item = await tx.itemInventario.findUnique({ where: { id: parseInt(item_id) } });
        if (!item) {
          throw new Error(`Item con ID ${item_id} no encontrado.`);
        }

        // Obtener meta data de la caja según el maestro de artículos
        const totalFrascos = Number(item.frascos_por_caja) || 1;
        const volPorFrasco = Number(item.volumen_por_frasco) || (Number(item.volumen_total_caja) / totalFrascos) || 50;
        const volTotalCaja = totalFrascos * volPorFrasco;
        const consumoPorPrueba = Number(item.consumo_indicado) || 0.25;
        const pruebasPorFrasco = Number(item.pruebas_teoricas_frasco) || Math.floor(volPorFrasco / consumoPorPrueba);
        const pruebasPorCaja = Number(item.pruebas_teoricas_caja) || (pruebasPorFrasco * totalFrascos);

        const metadata = {
          frasco_actual: 0,
          total_frascos: totalFrascos,
          vol_por_frasco: volPorFrasco,
          volumen_total_caja: volTotalCaja,
          consumo_indicado: consumoPorPrueba,
          pruebas_por_frasco: pruebasPorFrasco,
          pruebas_por_caja: pruebasPorCaja,
          equipo_asociado: (item.marca || '').toLowerCase().includes('mindray') ? 'Mindray BS-230' : 'CM 260i',
          frasco_2_disponible: totalFrascos > 1,
          frasco_2_abierto: false
        };

        // Crear una entrada en LotesReactivos por CADA caja para que se pueda gestionar individualmente (Cajas Cerradas)
        for (let i = 0; i < qty; i++) {
          await tx.lotesReactivos.create({
            data: {
              InventarioId: parseInt(item_id),
              NumeroLote: numero_lote,
              FechaVencimiento: new Date(fecha_vencimiento),
              FechaFabricacion: new Date(),
              CantidadInicial: volTotalCaja,
              CantidadActual: volTotalCaja,
              ConsumoPorPrueba: consumoPorPrueba,
              ReactivoPorPrueba: consumoPorPrueba,
              PruebasTeoricas: pruebasPorCaja,
              PruebasRestantes: pruebasPorCaja,
              Estado: 'Activo', // Activo pero sin FechaApertura = Cerrada en Nevera
              FechaApertura: null,
              UsuarioApertura: null,
              CondicionesEspeciales: JSON.stringify(metadata)
            }
          });
        }

        // Actualizar Stock del Almacén
        let stockRecord = await tx.stockPorAlmacen.findUnique({
          where: {
            item_id_almacen_id: {
              item_id: parseInt(item_id),
              almacen_id: parseInt(almacen_id)
            }
          }
        });

        const stock_anterior = stockRecord ? Number(stockRecord.stock_actual) : 0;
        const stock_nuevo = stock_anterior + qty;

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

        // Registrar el Movimiento (Kárdex) agrupado por lote
        const movimiento = await tx.movimientoInventario.create({
          data: {
            item_id: parseInt(item_id),
            tipo_movimiento: 'ENTRADA',
            cantidad: qty,
            stock_anterior,
            stock_nuevo,
            motivo: motivo || 'Conteo Inicial de Inventario',
            referencia: `INI-${numero_lote}-${Date.now().toString().slice(-4)}`,
            almacen_id: parseInt(almacen_id),
            creado_por: userId || 1
          }
        });

        // Recalcular stock global acumulado en itemInventario
        const allStocks = await tx.stockPorAlmacen.findMany({
          where: { item_id: parseInt(item_id) }
        });
        const totalGlobalStock = allStocks.reduce((sum, s) => sum + Number(s.stock_actual), 0);

        await tx.itemInventario.update({
          where: { id: parseInt(item_id) },
          data: { stock_actual: totalGlobalStock }
        });

        totalCajas += qty;
      }

      return { 
        success: true, 
        message: `Inventario inicial registrado con éxito. Se agregaron ${totalCajas} cajas en total.` 
      };
    });
  }
}

module.exports = new MovementsService();
