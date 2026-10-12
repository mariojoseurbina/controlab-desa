const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auditService = require('./auditService');

// REGLA DE NEGOCIO PERMANENTE: NORMALIZACION UNIVERSAL A MAYUSCULAS Y LIMPIEZA DE CARACTERES
const normalizarTextoMayusculas = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/Ã¡/g, 'Á')
    .replace(/Ã©/g, 'É')
    .replace(/Ã­/g, 'Í')
    .replace(/Ã³/g, 'Ó')
    .replace(/Ãº/g, 'Ú')
    .replace(/Ã±/g, 'Ñ')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/Â/g, '')
    .trim()
    .toUpperCase();
};

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
      select: {
        id: true,
        nombre: true,
        codigo: true,
        presentacion: true,
        unidad_manejo: true,
        unidad: true,
        categoria: true,
        equipo_asociado: true
      }
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
        motivo: normalizarTextoMayusculas(m.motivo),
        referencia: normalizarTextoMayusculas(m.referencia),
        fecha_movimiento: m.fecha_movimiento,
        creado_por: m.creado_por,
        almacen_id: m.almacen_id,
        almacen_destino_id: m.almacen_destino_id,
        item_nombre: item.nombre || 'N/A',
        item_codigo: item.codigo || 'N/A',
        item_presentacion: (item.categoria === 'REACTIVO' || item.categoria === 'REACTIVOS' || (item.codigo && (item.codigo.startsWith('REA-') || item.codigo.startsWith('INS-')))) ? (item.presentacion || 'Cajas') : (item.presentacion || item.unidad_manejo || item.unidad || 'UND'),
        item_unidad_manejo: (item.categoria === 'REACTIVO' || item.categoria === 'REACTIVOS' || (item.codigo && (item.codigo.startsWith('REA-') || item.codigo.startsWith('INS-')))) ? 'Cajas' : (item.unidad_manejo || item.unidad || 'UND'),
        item_equipo: item.equipo_asociado || 'GENERAL',
        almacen_nombre: m.almacen?.nombre || 'N/A',
        almacen_destino_nombre: m.almacen_destino?.nombre || 'N/A'
      };
    });
  }

  async createMovement(data, userId) {
    const { item_id, tipo_movimiento, cantidad, motivo, referencia, almacen_id, items } = data;

    if (!tipo_movimiento || !almacen_id) {
      throw new Error('Tipo de movimiento y almacén son obligatorios');
    }

    let itemsToProcess = [];
    if (items && Array.isArray(items) && items.length > 0) {
      itemsToProcess = items;
    } else if (item_id && cantidad) {
      itemsToProcess = [{ item_id, cantidad }];
    } else {
      throw new Error('Debe especificar al menos un producto con su cantidad');
    }

    const refFinal = normalizarTextoMayusculas(referencia) || `${tipo_movimiento.substring(0, 3)}-${Date.now().toString().slice(-6)}`;
    const motivoFinal = normalizarTextoMayusculas(motivo) || 'MOVIMIENTO DE INVENTARIO';
    const almIdNum = parseInt(almacen_id, 10);

    return await prisma.$transaction(async (tx) => {
      const movimientosCreados = [];

      for (const it of itemsToProcess) {
        const targetItemId = parseInt(it.item_id, 10);
        const qty = parseFloat(it.cantidad);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Cantidad inválida (${it.cantidad}) para el producto ID ${targetItemId}`);
        }

        let stockRecord = await tx.stockPorAlmacen.findUnique({
          where: {
            item_id_almacen_id: {
              item_id: targetItemId,
              almacen_id: almIdNum
            }
          }
        });

        const stock_anterior = stockRecord ? Number(stockRecord.stock_actual) : 0;
        const stock_nuevo = tipo_movimiento === 'ENTRADA' ? stock_anterior + qty : stock_anterior - qty;

        if ((tipo_movimiento === 'SALIDA' || tipo_movimiento === 'MERMA') && (stock_anterior <= 0 || qty > stock_anterior)) {
          const itemDb = await tx.itemInventario.findUnique({ where: { id: targetItemId } });
          const itemNombre = itemDb ? itemDb.nombre : `ID ${targetItemId}`;
          throw new Error(`REGLA DE CONTROL: Para el producto "${itemNombre}", la cantidad a egresar (${qty}) no puede ser mayor al stock disponible en el almacén (${stock_anterior}).`);
        }

        if (stock_nuevo < 0) {
          throw new Error('Stock insuficiente en la ubicación seleccionada para realizar este egreso');
        }

        await tx.stockPorAlmacen.upsert({
          where: {
            item_id_almacen_id: {
              item_id: targetItemId,
              almacen_id: almIdNum
            }
          },
          update: { stock_actual: stock_nuevo },
          create: {
            item_id: targetItemId,
            almacen_id: almIdNum,
            stock_actual: stock_nuevo
          }
        });

        if ((tipo_movimiento === 'SALIDA' || tipo_movimiento === 'MERMA') && almIdNum === 1) {
          let restanteLotes = qty;
          const lotesDisponibles = await tx.lotesReactivos.findMany({
            where: {
              InventarioId: targetItemId,
              OR: [
                { estado_transferencia: 'ALMACEN_CENTRAL' },
                { estado_transferencia: null }
              ],
              CantidadActual: { gt: 0 }
            },
            orderBy: [
              { FechaVencimiento: 'asc' },
              { Id: 'asc' }
            ]
          });

          for (const lote of lotesDisponibles) {
            if (restanteLotes <= 0) break;
            const stockLote = Number(lote.CantidadActual) || 0;
            const tomar = Math.min(restanteLotes, stockLote);
            const saldoLote = stockLote - tomar;

            await tx.lotesReactivos.update({
              where: { Id: lote.Id },
              data: { CantidadActual: saldoLote }
            });

            restanteLotes -= tomar;
          }
        }

        const allStocks = await tx.stockPorAlmacen.findMany({
          where: { item_id: targetItemId }
        });
        const totalGlobalStock = allStocks.reduce((sum, s) => sum + Number(s.stock_actual), 0);

        await tx.itemInventario.update({
          where: { id: targetItemId },
          data: { stock_actual: totalGlobalStock }
        });

        const movimiento = await tx.movimientoInventario.create({
          data: {
            item_id: targetItemId,
            tipo_movimiento,
            cantidad: qty,
            stock_anterior,
            stock_nuevo,
            motivo: motivoFinal,
            referencia: refFinal,
            almacen_id: almIdNum,
            creado_por: userId || 1
          }
        });

        movimientosCreados.push(movimiento);

        await auditService.logEvent(
          userId || 1,
          'REGISTRAR_MOVIMIENTO',
          'MOVIMIENTO',
          movimiento.id,
          {
            item_id: targetItemId,
            tipo_movimiento,
            cantidad: qty,
            almacen_id: almIdNum,
            motivo: motivoFinal,
            referencia: refFinal,
            stock_anterior,
            stock_nuevo
          }
        );
      }

      return {
        success: true,
        message: itemsToProcess.length > 1
          ? `Movimiento masivo de ${itemsToProcess.length} productos registrado exitosamente`
          : 'Movimiento registrado exitosamente',
        count: itemsToProcess.length,
        referencia: refFinal,
        data: movimientosCreados
      };
    });
  }

  async transferStock(data, userId) {
    const { item_id, cantidad, almacen_origen_id, almacen_destino_id, motivo, referencia, lotes_transferir } = data;

    if (!item_id || !cantidad || !almacen_origen_id || !almacen_destino_id) {
      throw new Error('ParÃ¡metros de transferencia incompletos');
    }

    if (parseInt(almacen_origen_id) === parseInt(almacen_destino_id)) {
      throw new Error('El almacÃ©n de origen y destino no pueden ser iguales');
    }

    return await prisma.$transaction(async (tx) => {
      // BIFURCACION LOGICA: Obtener datos del item para saber a que Familia pertenece
      const itemInfo = await tx.itemInventario.findUnique({
        where: { id: parseInt(item_id) }
      });

      if (!itemInfo) {
        throw new Error('Item no encontrado en el inventario.');
      }

      const esFamiliaA = ['Reactivo', 'Calibrador', 'Control', 'Reactivos', 'Calibradores', 'Controles'].includes(itemInfo.categoria) || itemInfo.unidad === 'Cajas';
      const unidadDeDespacho = itemInfo.unidad || 'UND';

      // 1. Validar y restar en almacÃ©n origen
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
        throw new Error(`REGLA DE CONTROL: El almacÃ©n de origen seleccionado posee 0 ${unidadDeDespacho} disponibles de este producto. No se pueden realizar transferencias sin existencia previa.`);
      }

      if (qty > stock_anterior_origen) {
        throw new Error(`REGLA DE CONTROL: La cantidad a transferir (${qty} ${unidadDeDespacho}) NUNCA puede ser mayor a la cantidad existente en el almacÃ©n de origen (${stock_anterior_origen} ${unidadDeDespacho}).`);
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

      // 2. Sumar en almacÃ©n destino (SEGUN FAMILIA)
      let stock_anterior_destino = 0;
      let stock_nuevo_destino = 0;

      let stockDestino = await tx.stockPorAlmacen.findUnique({
        where: {
          item_id_almacen_id: {
            item_id: parseInt(item_id),
            almacen_id: parseInt(almacen_destino_id)
          }
        }
      });
      stock_anterior_destino = stockDestino ? Number(stockDestino.stock_actual) : 0;

      if (esFamiliaA) {
        // FAMILIA A: Trazabilidad estricta por caja hacia Recepcion Electronica de Laboratorio
        if (parseInt(almacen_origen_id) === 1 && parseInt(almacen_destino_id) === 2) {
          const cajasADespachar = [];

          if (Array.isArray(lotes_transferir) && lotes_transferir.length > 0) {
            // Caso 1: Lotes seleccionados explicitamente en el Modal
            for (const itemLote of lotes_transferir) {
              const lId = parseInt(itemLote.lote_id || itemLote.id, 10);
              const cantLote = parseFloat(itemLote.cantidad || 1);
              if (!lId || cantLote <= 0) continue;

              const loteOrigen = await tx.lotesReactivos.findUnique({ where: { Id: lId } });
              if (!loteOrigen) {
                throw new Error(`El lote seleccionado (ID: ${lId}) no fue encontrado.`);
              }
              const stockLote = Number(loteOrigen.CantidadActual) || 0;
              if (cantLote > stockLote) {
                throw new Error(`El lote ${loteOrigen.NumeroLote} solo tiene ${stockLote} cajas disponibles.`);
              }

              // Descontar del lote en Almacen Central
              const saldoCentral = stockLote - cantLote;
              await tx.lotesReactivos.update({
                where: { Id: loteOrigen.Id },
                data: { CantidadActual: saldoCentral }
              });

              for (let i = 0; i < cantLote; i++) {
                cajasADespachar.push(loteOrigen);
              }
            }
          } else {
            // Caso 2: Fallback automatico FIFO si no se especificaron lotes
            let restante = parseFloat(qty);
            const lotesDisponibles = await tx.lotesReactivos.findMany({
              where: {
                InventarioId: parseInt(item_id),
                OR: [
                  { estado_transferencia: 'ALMACEN_CENTRAL' },
                  { estado_transferencia: null }
                ],
                CantidadActual: { gt: 0 }
              },
              orderBy: [
                { FechaVencimiento: 'asc' },
                { Id: 'asc' }
              ]
            });

            for (const lote of lotesDisponibles) {
              if (restante <= 0) break;
              const stockLote = Number(lote.CantidadActual) || 0;
              const tomar = Math.min(restante, stockLote);

              const saldoCentral = stockLote - tomar;
              await tx.lotesReactivos.update({
                where: { Id: lote.Id },
                data: { CantidadActual: saldoCentral }
              });

              for (let i = 0; i < tomar; i++) {
                cajasADespachar.push(lote);
              }
              restante -= tomar;
            }
          }

          // Crear los registros fisicos independientes (1 caja por registro) en transito hacia Laboratorio
          const usuarioDesp = userId ? `Usuario #${userId}` : 'Almacen Central';
          for (const loteBase of cajasADespachar) {
            await tx.lotesReactivos.create({
              data: {
                InventarioId: loteBase.InventarioId,
                NumeroLote: loteBase.NumeroLote,
                CantidadInicial: 1,
                CantidadActual: 1,
                Estado: 'CERRADO',
                estado_transferencia: 'EN_TRANSITO_LAB',
                almacen_origen_id: 1,
                almacen_destino_id: parseInt(almacen_destino_id),
                usuario_despacho: usuarioDesp,
                fecha_despacho: new Date(),
                FechaRegistro: new Date(),
                FechaFabricacion: loteBase.FechaFabricacion,
                FechaVencimiento: loteBase.FechaVencimiento,
                CondicionesEspeciales: loteBase.CondicionesEspeciales,
                TemperaturaAlmacenamiento: loteBase.TemperaturaAlmacenamiento,
                ConsumoPorPrueba: loteBase.ConsumoPorPrueba,
                VolumenTrabajoPractico: loteBase.VolumenTrabajoPractico,
                PruebasTeoricas: loteBase.PruebasTeoricas,
                PruebasRestantes: loteBase.PruebasRestantes,
                ReactivoPorPrueba: loteBase.ReactivoPorPrueba,
                EsBiReactivo: loteBase.EsBiReactivo,
                CantidadInicialR2: loteBase.CantidadInicialR2,
                CantidadActualR2: loteBase.CantidadActualR2,
                ConsumoPorPruebaR2: loteBase.ConsumoPorPruebaR2
              }
            });
          }
        }
        
        stock_nuevo_destino = stock_anterior_destino;

      } else {
          // FAMILIA B (Insumos, Papeleria, etc): Transferencia directa e inmediata
          stock_nuevo_destino = stock_anterior_destino + qty;
  
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

          // ACTUALIZACION: Mover LotesReactivos fisicos directo a laboratorio sin limbo
          if (parseInt(almacen_origen_id) === 1 && parseInt(almacen_destino_id) === 2) {
            const cajasFisicas = await tx.lotesReactivos.findMany({
              where: {
                InventarioId: parseInt(item_id),
                estado_transferencia: 'ALMACEN_CENTRAL'
              },
              take: parseInt(qty)
            });
            
            if (cajasFisicas.length > 0) {
              const idsToUpdate = cajasFisicas.map(c => c.Id);
              await tx.lotesReactivos.updateMany({
                where: { Id: { in: idsToUpdate } },
                data: {
                  estado_transferencia: 'LABORATORIO',
                  almacen_destino_id: parseInt(almacen_destino_id),
                  AlmacenId: parseInt(almacen_destino_id),
                  usuario_despacho: 'Transferencia Directa B',
                  fecha_despacho: new Date()
                }
              });
            }
          }
        }

      // 3. Recalcular y actualizar stock global acumulado en items_inventario (deberÃ­a quedar igual, pero asegura sincronizaciÃ³n)
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
          motivo: normalizarTextoMayusculas(motivo) || 'TRANSFERENCIA ENTRE ALMACENES',
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
      throw new Error('Debe especificar el almacÃ©n para la carga masiva.');
    }

    return await prisma.$transaction(async (tx) => {
      let totalCajas = 0;
      
      for (const loteData of lotes) {
        const { item_id, numero_lote, fecha_vencimiento, cantidad } = loteData;
        const qty = parseInt(cantidad, 10);

        if (!item_id || !numero_lote || !cantidad || qty <= 0) {
          throw new Error('Todos los lotes deben tener item_id, numero_lote y una cantidad vÃ¡lida mayor a cero.');
        }

        const item = await tx.itemInventario.findUnique({ where: { id: parseInt(item_id) } });
        if (!item) {
          throw new Error(`Item con ID ${item_id} no encontrado.`);
        }

        // Obtener meta data de la caja segÃºn el maestro de artÃ­culos
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

        // Actualizar Stock del AlmacÃ©n
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

        // Registrar el Movimiento (KÃ¡rdex) agrupado por lote
        const movimiento = await tx.movimientoInventario.create({
          data: {
            item_id: parseInt(item_id),
            tipo_movimiento: 'ENTRADA',
            cantidad: qty,
            stock_anterior,
            stock_nuevo,
            motivo: normalizarTextoMayusculas(motivo) || 'CONTEO INICIAL DE INVENTARIO',
            referencia: normalizarTextoMayusculas(`INI-${numero_lote}-${Date.now().toString().slice(-4)}`),
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
        message: `Inventario inicial registrado con Ã©xito. Se agregaron ${totalCajas} cajas en total.` 
      };
    });
  }
}

module.exports = new MovementsService();

