const purchasesRepository = require('./purchases.repository');
const prisma = require('../../core/prisma');
const auditService = require('../../../services/auditService');

const PROVEEDORES = {
  1: 'Lab Supplies C.A.',
  2: 'Meditek Venezuela',
  3: 'BioAnalítica S.A.',
  4: 'Química Avanzada'
};

class PurchasesService {
  async getAll() {
    const purchases = await purchasesRepository.findAll();
    const items = await prisma.itemInventario.findMany();
    const itemsMap = {};
    items.forEach(item => {
      itemsMap[item.id] = item;
    });

    const proveedores = await prisma.proveedores.findMany();
    const proveedoresMap = {};
    proveedores.forEach(p => {
      proveedoresMap[p.id] = p.nombre;
    });

    return purchases.map(purchase => {
      const item = itemsMap[purchase.item_id] || {};
      return {
        ...purchase,
        item_nombre: item.nombre || 'Producto Desconocido',
        item_codigo: item.codigo || '',
        proveedor_nombre: proveedoresMap[purchase.proveedor_id] || 'Proveedor Desconocido',
        // Prisma Decimal type to Float conversion for JSON compatibility
        cantidad: purchase.cantidad ? Number(purchase.cantidad) : 0,
        precio_unitario: purchase.precio_unitario ? Number(purchase.precio_unitario) : 0,
        total_linea: purchase.total_linea ? Number(purchase.total_linea) : 0
      };
    });
  }

  async getById(id) {
    const purchase = await purchasesRepository.findById(id);
    if (!purchase) return null;

    const item = await prisma.itemInventario.findUnique({
      where: { id: purchase.item_id }
    });

    let proveedor_nombre = 'Proveedor Desconocido';
    if (purchase.proveedor_id) {
      const proveedor = await prisma.proveedores.findUnique({
        where: { id: purchase.proveedor_id }
      });
      if (proveedor) {
        proveedor_nombre = proveedor.nombre;
      }
    }

    return {
      ...purchase,
      item_nombre: item?.nombre || 'Producto Desconocido',
      item_codigo: item?.codigo || '',
      proveedor_nombre,
      cantidad: purchase.cantidad ? Number(purchase.cantidad) : 0,
      precio_unitario: purchase.precio_unitario ? Number(purchase.precio_unitario) : 0,
      total_linea: purchase.total_linea ? Number(purchase.total_linea) : 0
    };
  }

  async create(data) {
    const { 
      estado, item_id, cantidad, precio_unitario, numero_factura, proveedor_id,
      tasa_cambio, moneda_factura, precio_unitario_usd, precio_unitario_ves, porcentaje_impuesto
    } = data;

    const qty = parseFloat(cantidad) || 0;
    const tasa = parseFloat(tasa_cambio) || 1.0;
    const pct_iva = parseFloat(porcentaje_impuesto) || 0.0;
    const moneda = moneda_factura || 'USD';

    let p_usd = 0;
    let p_ves = 0;

    if (moneda === 'VES') {
      p_ves = parseFloat(precio_unitario_ves) || parseFloat(precio_unitario) || 0;
      p_usd = tasa > 0 ? p_ves / tasa : 0;
    } else {
      p_usd = parseFloat(precio_unitario_usd) || parseFloat(precio_unitario) || 0;
      p_ves = p_usd * tasa;
    }

    const sub_usd = qty * p_usd;
    const sub_ves = qty * p_ves;
    const tax_usd = sub_usd * (pct_iva / 100);
    const tax_ves = sub_ves * (pct_iva / 100);
    const tot_usd = sub_usd + tax_usd;
    const tot_ves = sub_ves + tax_ves;

    return await prisma.$transaction(async (tx) => {
      // 1. Crear la compra
      const newPurchase = await tx.compras_inventario.create({
        data: {
          proveedor_id: proveedor_id ? parseInt(proveedor_id) : null,
          numero_factura,
          fecha_compra: data.fecha_compra ? new Date(data.fecha_compra) : null,
          fecha_recibido: data.fecha_recibido ? new Date(data.fecha_recibido) : null,
          item_id: item_id ? parseInt(item_id) : null,
          cantidad: qty,
          precio_unitario: p_usd,
          total_linea: tot_usd,
          estado: estado || 'pendiente',
          creado_por: data.creado_por || 'admin',
          fecha_creacion: new Date(),
          fecha_actualizacion: new Date(),
          tasa_cambio: tasa,
          moneda_factura: moneda,
          precio_unitario_usd: p_usd,
          precio_unitario_ves: p_ves,
          porcentaje_impuesto: pct_iva,
          monto_impuesto_usd: tax_usd,
          monto_impuesto_ves: tax_ves,
          subtotal_usd: sub_usd,
          subtotal_ves: sub_ves,
          total_linea_usd: tot_usd,
          total_linea_ves: tot_ves
        }
      });

      // 2. Si el estado es 'recibido', actualizar inventario
      if (estado === 'recibido' && item_id) {
        const item = await tx.itemInventario.findUnique({
          where: { id: parseInt(item_id) }
        });

        if (item) {
          const stock_anterior = Number(item.stock_actual) || 0;
          const stock_nuevo = stock_anterior + qty;

          let proveedorName = item.proveedor;
          if (proveedor_id) {
            const prov = await tx.proveedores.findUnique({
              where: { id: parseInt(proveedor_id) }
            });
            if (prov) proveedorName = prov.nombre;
          }

          // Recalcular precio_venta sugerido si el item tiene porcentaje_utilidad
          let nuevo_precio_venta = item.precio_venta;
          if (item.porcentaje_utilidad && Number(item.porcentaje_utilidad) > 0) {
            const pct_util = Number(item.porcentaje_utilidad) / 100;
            const factor_iva = item.aplica_iva ? 1.16 : 1.0;
            nuevo_precio_venta = (p_usd * factor_iva) * (1 + pct_util);
          }

          // Actualizar stock, precio_costo, precio_venta y proveedor del item
          await tx.itemInventario.update({
            where: { id: item.id },
            data: {
              stock_actual: stock_nuevo,
              precio_costo: p_usd,
              precio_venta: nuevo_precio_venta ? parseFloat(nuevo_precio_venta.toFixed(2)) : item.precio_venta,
              proveedor: proveedorName
            }
          });

          // Registrar movimiento
          await tx.movimientoInventario.create({
            data: {
              item_id: item.id,
              tipo_movimiento: 'ENTRADA',
              cantidad: qty,
              stock_anterior: stock_anterior,
              stock_nuevo: stock_nuevo,
              motivo: `Compra registrada y recibida - Factura ${numero_factura || 'S/N'}`,
              referencia: numero_factura || 'COMPRA',
              creado_por: 1
            }
          });
        }
      }

      // Registrar auditoria
      await auditService.logEvent(
        data.creado_por || 1, 
        'COMPRA_CREADA', 
        'COMPRA', 
        newPurchase.id, 
        { 
          proveedor_id: newPurchase.proveedor_id, 
          numero_factura: newPurchase.numero_factura,
          estado: newPurchase.estado,
          total: newPurchase.total_linea
        }
      );

      return newPurchase;
    });
  }

  async createMultiple(data) {
    const { 
      proveedor_id, numero_factura, fecha_compra, fecha_recibido,
      tasa_cambio, moneda_factura, items, creado_por
    } = data;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Debe proveer al menos un item para la compra múltiple');
    }

    const tasa = parseFloat(tasa_cambio) || 1.0;
    const moneda = moneda_factura || 'USD';
    const provId = proveedor_id ? parseInt(proveedor_id) : null;

    return await prisma.$transaction(async (tx) => {
      const resultados = [];
      
      let proveedorName = 'Proveedor Desconocido';
      if (provId) {
        const prov = await tx.proveedores.findUnique({ where: { id: provId } });
        if (prov) proveedorName = prov.nombre;
      }

      for (const itemData of items) {
        const qty = parseFloat(itemData.cantidad) || 0;
        const pct_iva = parseFloat(itemData.porcentaje_impuesto) || 0.0;
        const estado = itemData.estado || 'pendiente';
        
        let p_usd = 0;
        let p_ves = 0;

        if (moneda === 'VES') {
          p_ves = parseFloat(itemData.precio_unitario) || 0;
          p_usd = tasa > 0 ? p_ves / tasa : 0;
        } else {
          p_usd = parseFloat(itemData.precio_unitario) || 0;
          p_ves = p_usd * tasa;
        }

        const sub_usd = qty * p_usd;
        const sub_ves = qty * p_ves;
        const tax_usd = sub_usd * (pct_iva / 100);
        const tax_ves = sub_ves * (pct_iva / 100);
        const tot_usd = sub_usd + tax_usd;
        const tot_ves = sub_ves + tax_ves;

        // 1. Crear compra individual
        const newPurchase = await tx.compras_inventario.create({
          data: {
            proveedor_id: provId,
            numero_factura,
            fecha_compra: fecha_compra ? new Date(fecha_compra) : null,
            fecha_recibido: fecha_recibido ? new Date(fecha_recibido) : null,
            item_id: itemData.item_id ? parseInt(itemData.item_id) : null,
            cantidad: qty,
            precio_unitario: p_usd,
            total_linea: tot_usd,
            estado: estado,
            creado_por: creado_por || 'admin',
            fecha_creacion: new Date(),
            fecha_actualizacion: new Date(),
            tasa_cambio: tasa,
            moneda_factura: moneda,
            precio_unitario_usd: p_usd,
            precio_unitario_ves: p_ves,
            porcentaje_impuesto: pct_iva,
            monto_impuesto_usd: tax_usd,
            monto_impuesto_ves: tax_ves,
            subtotal_usd: sub_usd,
            subtotal_ves: sub_ves,
            total_linea_usd: tot_usd,
            total_linea_ves: tot_ves
          }
        });

        // 2. Si el estado es 'recibido', actualizar inventario
        if (estado === 'recibido' && itemData.item_id) {
          const itemInv = await tx.itemInventario.findUnique({
            where: { id: parseInt(itemData.item_id) }
          });

          if (itemInv) {
            const stock_anterior = Number(itemInv.stock_actual) || 0;
            const stock_nuevo = stock_anterior + qty;

            await tx.itemInventario.update({
              where: { id: itemInv.id },
              data: {
                stock_actual: stock_nuevo,
                precio_costo: p_usd,
                proveedor: proveedorName
              }
            });

            await tx.movimientoInventario.create({
              data: {
                item_id: itemInv.id,
                tipo_movimiento: 'ENTRADA',
                cantidad: qty,
                stock_anterior: stock_anterior,
                stock_nuevo: stock_nuevo,
                motivo: `Compra masiva registrada y recibida - Factura ${numero_factura || 'S/N'}`,
                referencia: numero_factura || 'COMPRA_MULTIPLE',
                creado_por: 1
              }
            });
          }
        }
        resultados.push(newPurchase);
      }
      
      return resultados;
    });
  }

  async update(id, data) {
    const { 
      estado, item_id, cantidad, precio_unitario, numero_factura, proveedor_id,
      tasa_cambio, moneda_factura, precio_unitario_usd, precio_unitario_ves, porcentaje_impuesto
    } = data;

    const qty = parseFloat(cantidad) || 0;
    const tasa = parseFloat(tasa_cambio) || 1.0;
    const pct_iva = parseFloat(porcentaje_impuesto) || 0.0;
    const moneda = moneda_factura || 'USD';

    let p_usd = 0;
    let p_ves = 0;

    if (moneda === 'VES') {
      p_ves = parseFloat(precio_unitario_ves) || parseFloat(precio_unitario) || 0;
      p_usd = tasa > 0 ? p_ves / tasa : 0;
    } else {
      p_usd = parseFloat(precio_unitario_usd) || parseFloat(precio_unitario) || 0;
      p_ves = p_usd * tasa;
    }

    const sub_usd = qty * p_usd;
    const sub_ves = qty * p_ves;
    const tax_usd = sub_usd * (pct_iva / 100);
    const tax_ves = sub_ves * (pct_iva / 100);
    const tot_usd = sub_usd + tax_usd;
    const tot_ves = sub_ves + tax_ves;

    return await prisma.$transaction(async (tx) => {
      // Obtener compra existente antes del cambio
      const existing = await tx.compras_inventario.findUnique({
        where: { id: parseInt(id) }
      });

      if (!existing) {
        throw new Error('Compra no encontrada');
      }

      // Caso especial: Si estamos marcando como 'recibido' una línea 'pendiente',
      // revisamos si existe una línea 'parcial' para la misma factura e ítem.
      if (existing.estado === 'pendiente' && estado === 'recibido') {
        const parcialLine = await tx.compras_inventario.findFirst({
          where: {
            numero_factura: existing.numero_factura,
            item_id: existing.item_id,
            estado: 'parcial'
          }
        });

        if (parcialLine) {
          console.log(`🔗 Consolidando línea pendiente con línea parcial existente para Factura: ${existing.numero_factura}`);
          
          const qtyParcial = Number(parcialLine.cantidad) || 0;
          const qtyNuevaTotal = qtyParcial + qty;
          
          const subtotalConsolidado_usd = qtyNuevaTotal * Number(parcialLine.precio_unitario_usd || parcialLine.precio_unitario || 0);
          const subtotalConsolidado_ves = qtyNuevaTotal * Number(parcialLine.precio_unitario_ves || 0);
          
          const pct_iva = Number(parcialLine.porcentaje_impuesto) || 0.0;
          const taxConsolidado_usd = subtotalConsolidado_usd * (pct_iva / 100);
          const taxConsolidado_ves = subtotalConsolidado_ves * (pct_iva / 100);
          const totConsolidado_usd = subtotalConsolidado_usd + taxConsolidado_usd;
          const totConsolidado_ves = subtotalConsolidado_ves + taxConsolidado_ves;

          // 1. Actualizar la línea parcial existente para que sea 'recibido' con el total consolidado
          const consolidated = await tx.compras_inventario.update({
            where: { id: parcialLine.id },
            data: {
              cantidad: qtyNuevaTotal,
              estado: 'recibido',
              fecha_recibido: new Date(),
              fecha_actualizacion: new Date(),
              subtotal_usd: subtotalConsolidado_usd,
              subtotal_ves: subtotalConsolidado_ves,
              monto_impuesto_usd: taxConsolidado_usd,
              monto_impuesto_ves: taxConsolidado_ves,
              total_linea: totConsolidado_usd,
              total_linea_usd: totConsolidado_usd,
              total_linea_ves: totConsolidado_ves
            }
          });

          // 2. Eliminar la línea pendiente que acabamos de recibir (ya que se fusionó)
          await tx.compras_inventario.delete({
            where: { id: parseInt(id) }
          });

          // 3. Incrementar el stock de inventario por la cantidad de la línea pendiente (qty)
          if (existing.item_id) {
            const item = await tx.itemInventario.findUnique({
              where: { id: existing.item_id }
            });

            if (item) {
              const stock_anterior = Number(item.stock_actual) || 0;
              const stock_nuevo = stock_anterior + qty;

              await tx.itemInventario.update({
                where: { id: item.id },
                data: {
                  stock_actual: stock_nuevo
                }
              });

              // Registrar movimiento de ENTRADA
              await tx.movimientoInventario.create({
                data: {
                  item_id: item.id,
                  tipo_movimiento: 'ENTRADA',
                  cantidad: qty,
                  stock_anterior: stock_anterior,
                  stock_nuevo: stock_nuevo,
                  motivo: `Faltante de entrega parcial recibido y consolidado - Factura ${existing.numero_factura || 'S/N'}`,
                  referencia: existing.numero_factura || 'COMPRA_COMPLETA',
                  creado_por: 1
                }
              });
            }
          }

          return consolidated;
        }
      }

      // Actualizar la compra
      const updatedPurchase = await tx.compras_inventario.update({
        where: { id: parseInt(id) },
        data: {
          proveedor_id: proveedor_id ? parseInt(proveedor_id) : null,
          numero_factura,
          fecha_compra: data.fecha_compra ? new Date(data.fecha_compra) : null,
          fecha_recibido: data.fecha_recibido ? new Date(data.fecha_recibido) : null,
          item_id: item_id ? parseInt(item_id) : null,
          cantidad: qty,
          precio_unitario: p_usd,
          total_linea: tot_usd,
          estado: estado || 'pendiente',
          fecha_actualizacion: new Date(),
          tasa_cambio: tasa,
          moneda_factura: moneda,
          precio_unitario_usd: p_usd,
          precio_unitario_ves: p_ves,
          porcentaje_impuesto: pct_iva,
          monto_impuesto_usd: tax_usd,
          monto_impuesto_ves: tax_ves,
          subtotal_usd: sub_usd,
          subtotal_ves: sub_ves,
          total_linea_usd: tot_usd,
          total_linea_ves: tot_ves
        }
      });

      const itemId = item_id ? parseInt(item_id) : existing.item_id;
      if (!itemId) return updatedPurchase;

      const existingQty = Number(existing.cantidad) || 0;
      const existingEstado = existing.estado || 'pendiente';

      const item = await tx.itemInventario.findUnique({
        where: { id: itemId }
      });

      if (item) {
        const stock_actual_item = Number(item.stock_actual) || 0;

        // Caso 1: Transición de NO recibido -> RECIBIDO
        if (existingEstado !== 'recibido' && estado === 'recibido') {
          const stock_nuevo = stock_actual_item + qty;

          let proveedorName = item.proveedor;
          if (proveedor_id) {
            const prov = await tx.proveedores.findUnique({
              where: { id: parseInt(proveedor_id) }
            });
            if (prov) proveedorName = prov.nombre;
          }

          await tx.itemInventario.update({
            where: { id: itemId },
            data: {
              stock_actual: stock_nuevo,
              precio_costo: p_usd,
              proveedor: proveedorName
            }
          });

          await tx.movimientoInventario.create({
            data: {
              item_id: itemId,
              tipo_movimiento: 'ENTRADA',
              cantidad: qty,
              stock_anterior: stock_actual_item,
              stock_nuevo: stock_nuevo,
              motivo: `Compra marcada como recibida - Factura ${numero_factura || 'S/N'}`,
              referencia: numero_factura || 'COMPRA',
              creado_por: 1
            }
          });
        }
        // Caso 2: Transición de RECIBIDO -> NO recibido / Cancelado
        else if (existingEstado === 'recibido' && estado !== 'recibido') {
          const stock_nuevo = stock_actual_item - existingQty;

          await tx.itemInventario.update({
            where: { id: itemId },
            data: {
              stock_actual: stock_nuevo >= 0 ? stock_nuevo : 0
            }
          });

          await tx.movimientoInventario.create({
            data: {
              item_id: itemId,
              tipo_movimiento: 'SALIDA',
              cantidad: existingQty,
              stock_anterior: stock_actual_item,
              stock_nuevo: stock_nuevo >= 0 ? stock_nuevo : 0,
              motivo: `Compra revertida (estado cambiado a ${estado}) - Factura ${numero_factura || 'S/N'}`,
              referencia: numero_factura || 'COMPRA',
              creado_por: 1
            }
          });
        }
        // Caso 3: Se mantiene en RECIBIDO, pero cambia la cantidad
        else if (existingEstado === 'recibido' && estado === 'recibido') {
          const diff = qty - existingQty;
          if (diff !== 0) {
            const stock_nuevo = stock_actual_item + diff;

            let proveedorName = item.proveedor;
            if (proveedor_id) {
              const prov = await tx.proveedores.findUnique({
                where: { id: parseInt(proveedor_id) }
              });
              if (prov) proveedorName = prov.nombre;
            }

            await tx.itemInventario.update({
              where: { id: itemId },
              data: {
                stock_actual: stock_nuevo >= 0 ? stock_nuevo : 0,
                precio_costo: p_usd,
                proveedor: proveedorName
              }
            });

            await tx.movimientoInventario.create({
              data: {
                item_id: itemId,
                tipo_movimiento: diff > 0 ? 'ENTRADA' : 'SALIDA',
                cantidad: Math.abs(diff),
                stock_anterior: stock_actual_item,
                stock_nuevo: stock_nuevo >= 0 ? stock_nuevo : 0,
                motivo: `Ajuste de cantidad en compra recibida - Factura ${numero_factura || 'S/N'}`,
                referencia: numero_factura || 'COMPRA',
                creado_por: 1
              }
            });
          } else if (p_usd !== Number(existing.precio_unitario)) {
            // Solo cambió el precio, actualizamos el costo
            await tx.itemInventario.update({
              where: { id: itemId },
              data: {
                precio_costo: p_usd
              }
            });
          }
        }
      }

      // Trazabilidad
      await auditService.logEvent(
        data.actualizado_por || 1, 
        'EDITAR_COMPRA', 
        'COMPRA', 
        updatedPurchase.id, 
        { 
          numero_factura: updatedPurchase.numero_factura,
          estado: updatedPurchase.estado,
          total: updatedPurchase.total_linea
        }
      );

      return updatedPurchase;
    });
  }

  async delete(id) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.compras_inventario.findUnique({
        where: { id: parseInt(id) }
      });

      if (!existing) {
        throw new Error('Compra no encontrada');
      }

      // Si estaba recibida, restar stock antes de eliminar
      if (existing.estado === 'recibido' && existing.item_id) {
        const item = await tx.itemInventario.findUnique({
          where: { id: existing.item_id }
        });

        if (item) {
          const stock_actual_item = Number(item.stock_actual) || 0;
          const qty = Number(existing.cantidad) || 0;
          const stock_nuevo = stock_actual_item - qty;

          await tx.itemInventario.update({
            where: { id: existing.item_id },
            data: {
              stock_actual: stock_nuevo >= 0 ? stock_nuevo : 0
            }
          });

          await tx.movimientoInventario.create({
            data: {
              item_id: existing.item_id,
              tipo_movimiento: 'SALIDA',
              cantidad: qty,
              stock_anterior: stock_actual_item,
              stock_nuevo: stock_nuevo >= 0 ? stock_nuevo : 0,
              motivo: `Compra eliminada - Factura ${existing.numero_factura || 'S/N'}`,
              referencia: existing.numero_factura || 'COMPRA_DEL',
              creado_por: 1
            }
          });
        }
      }

      return await tx.compras_inventario.delete({
        where: { id: parseInt(id) }
      });
    });
  }

  async getProveedores() {
    return await prisma.proveedores.findMany({
      orderBy: { nombre: 'asc' }
    });
  }

  async createProveedor(data) {
    const { nombre, creado_por } = data;
    if (!nombre || nombre.trim() === '') {
      throw new Error('El nombre del proveedor es obligatorio');
    }
    return await prisma.proveedores.create({
      data: {
        nombre: nombre.trim(),
        creado_por: creado_por || 'admin'
      }
    });
  }

  async recibirParcial(id, cantidadRecibida) {
    const qtyRecibida = parseFloat(cantidadRecibida);
    if (isNaN(qtyRecibida) || qtyRecibida <= 0) {
      throw new Error('La cantidad recibida debe ser un número mayor a 0');
    }

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.compras_inventario.findUnique({
        where: { id: parseInt(id) }
      });

      if (!existing) {
        throw new Error('Compra no encontrada');
      }

      if (existing.estado !== 'pendiente') {
        throw new Error('Solo se pueden recibir entregas parciales de compras en estado pendiente');
      }

      const qtyOriginal = Number(existing.cantidad) || 0;
      if (qtyRecibida >= qtyOriginal) {
        throw new Error('La cantidad recibida en una entrega parcial debe ser menor a la cantidad total pedida');
      }

      const qtyPendiente = qtyOriginal - qtyRecibida;
      const subtotalRecibido_usd = qtyRecibida * Number(existing.precio_unitario_usd || existing.precio_unitario || 0);
      const subtotalRecibido_ves = qtyRecibida * Number(existing.precio_unitario_ves || 0);
      
      const tasa = Number(existing.tasa_cambio) || 1.0;
      const pct_iva = Number(existing.porcentaje_impuesto) || 0.0;
      
      const taxRecibido_usd = subtotalRecibido_usd * (pct_iva / 100);
      const taxRecibido_ves = subtotalRecibido_ves * (pct_iva / 100);
      
      const totRecibido_usd = subtotalRecibido_usd + taxRecibido_usd;
      const totRecibido_ves = subtotalRecibido_ves + taxRecibido_ves;

      // 1. Modificar la línea original para que sea la parte recibida
      const updatedOriginal = await tx.compras_inventario.update({
        where: { id: parseInt(id) },
        data: {
          cantidad: qtyRecibida,
          estado: 'parcial', // Guardado como PARCIAL para control visual
          fecha_recibido: new Date(),
          fecha_actualizacion: new Date(),
          subtotal_usd: subtotalRecibido_usd,
          subtotal_ves: subtotalRecibido_ves,
          monto_impuesto_usd: taxRecibido_usd,
          monto_impuesto_ves: taxRecibido_ves,
          total_linea: totRecibido_usd,
          total_linea_usd: totRecibido_usd,
          total_linea_ves: totRecibido_ves
        }
      });

      // 2. Crear una nueva línea pendiente con el remanente
      const subtotalPendiente_usd = qtyPendiente * Number(existing.precio_unitario_usd || existing.precio_unitario || 0);
      const subtotalPendiente_ves = qtyPendiente * Number(existing.precio_unitario_ves || 0);
      const taxPendiente_usd = subtotalPendiente_usd * (pct_iva / 100);
      const taxPendiente_ves = subtotalPendiente_ves * (pct_iva / 100);
      const totPendiente_usd = subtotalPendiente_usd + taxPendiente_usd;
      const totPendiente_ves = subtotalPendiente_ves + taxPendiente_ves;

      const pendingLine = await tx.compras_inventario.create({
        data: {
          proveedor_id: existing.proveedor_id,
          numero_factura: existing.numero_factura,
          fecha_compra: existing.fecha_compra,
          item_id: existing.item_id,
          cantidad: qtyPendiente,
          precio_unitario: existing.precio_unitario,
          estado: 'pendiente',
          creado_por: existing.creado_por,
          tasa_cambio: existing.tasa_cambio,
          moneda_factura: existing.moneda_factura,
          precio_unitario_usd: existing.precio_unitario_usd,
          precio_unitario_ves: existing.precio_unitario_ves,
          porcentaje_impuesto: existing.porcentaje_impuesto,
          subtotal_usd: subtotalPendiente_usd,
          subtotal_ves: subtotalPendiente_ves,
          monto_impuesto_usd: taxPendiente_usd,
          monto_impuesto_ves: taxPendiente_ves,
          total_linea: totPendiente_usd,
          total_linea_usd: totPendiente_usd,
          total_linea_ves: totPendiente_ves,
          fecha_creacion: new Date(),
          fecha_actualizacion: new Date()
        }
      });

      // 3. Incrementar el stock del item en el inventario
      if (existing.item_id) {
        const item = await tx.itemInventario.findUnique({
          where: { id: existing.item_id }
        });

        if (item) {
          const stock_anterior = Number(item.stock_actual) || 0;
          const stock_nuevo = stock_anterior + qtyRecibida;

          await tx.itemInventario.update({
            where: { id: item.id },
            data: {
              stock_actual: stock_nuevo,
              precio_costo: Number(existing.precio_unitario_usd || existing.precio_unitario || 0)
            }
          });

          // Registrar movimiento de ENTRADA
          await tx.movimientoInventario.create({
            data: {
              item_id: item.id,
              tipo_movimiento: 'ENTRADA',
              cantidad: qtyRecibida,
              stock_anterior: stock_anterior,
              stock_nuevo: stock_nuevo,
              motivo: `Entrega parcial recibida - Factura ${existing.numero_factura || 'S/N'} (Original: ${qtyOriginal})`,
              referencia: existing.numero_factura || 'COMPRA_PARCIAL',
              creado_por: 1
            }
          });
        }
      }

      return {
        recibido: updatedOriginal,
        pendiente: pendingLine
      };
    });
  }

  async registrarDevolucion(id, cantidadDevolver, observaciones, userId) {
    const qtyDevolver = parseFloat(cantidadDevolver);
    if (isNaN(qtyDevolver) || qtyDevolver <= 0) {
      throw new Error('La cantidad a devolver debe ser un número mayor a 0');
    }

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.compras_inventario.findUnique({
        where: { id: parseInt(id) }
      });

      if (!existing) {
        throw new Error('Compra no encontrada');
      }

      const qtyOriginal = Number(existing.cantidad) || 0;
      if (qtyDevolver > qtyOriginal) {
        throw new Error('La cantidad a devolver no puede ser mayor a la cantidad de la compra');
      }

      // Descontar del inventario si el estado era 'recibido' o 'parcial'
      if ((existing.estado === 'recibido' || existing.estado === 'parcial') && existing.item_id) {
        const item = await tx.itemInventario.findUnique({
          where: { id: existing.item_id }
        });

        if (item) {
          const stock_anterior = Number(item.stock_actual) || 0;
          const stock_nuevo = stock_anterior - qtyDevolver;

          await tx.itemInventario.update({
            where: { id: item.id },
            data: {
              stock_actual: stock_nuevo >= 0 ? stock_nuevo : 0
            }
          });

          // Registrar movimiento de SALIDA por devolución
          await tx.movimientoInventario.create({
            data: {
              item_id: item.id,
              tipo_movimiento: 'SALIDA',
              cantidad: qtyDevolver,
              stock_anterior: stock_anterior,
              stock_nuevo: stock_nuevo >= 0 ? stock_nuevo : 0,
              motivo: `Devolución de Compra - ${observaciones || 'Reactivo/Artículo defectuoso'} - Factura ${existing.numero_factura || 'S/N'}`,
              referencia: existing.numero_factura || 'DEVOLUCION',
              creado_por: 1
            }
          });
        }
      }

      // Si es devolución total de la línea
      if (qtyDevolver === qtyOriginal) {
        const updatedPurchase = await tx.compras_inventario.update({
          where: { id: Number(id) },
          data: {
            estado: 'devuelto',
            fecha_actualizacion: new Date()
          }
        });

        // Trazabilidad
        await auditService.logEvent(
          userId || 1, 
          'CAMBIAR_ESTADO_COMPRA', 
          'COMPRA', 
          updatedPurchase.id, 
          { 
            numero_factura: updatedPurchase.numero_factura,
            estado_nuevo: 'devuelto',
            observaciones
          }
        );

        return { devuelto: updatedPurchase };
      } 
      // Si es devolución parcial, dividimos la línea
      else {
        const qtyRestante = qtyOriginal - qtyDevolver;
        const subtotalRestante_usd = qtyRestante * Number(existing.precio_unitario_usd || existing.precio_unitario || 0);
        const subtotalRestante_ves = qtyRestante * Number(existing.precio_unitario_ves || 0);
        
        const tasa = Number(existing.tasa_cambio) || 1.0;
        const pct_iva = Number(existing.porcentaje_impuesto) || 0.0;
        const taxRestante_usd = subtotalRestante_usd * (pct_iva / 100);
        const taxRestante_ves = subtotalRestante_ves * (pct_iva / 100);
        const totRestante_usd = subtotalRestante_usd + taxRestante_usd;
        const totRestante_ves = subtotalRestante_ves + taxRestante_ves;

        const updatedOriginal = await tx.compras_inventario.update({
          where: { id: parseInt(id) },
          data: {
            cantidad: qtyRestante,
            subtotal_usd: subtotalRestante_usd,
            subtotal_ves: subtotalRestante_ves,
            monto_impuesto_usd: taxRestante_usd,
            monto_impuesto_ves: taxRestante_ves,
            total_linea: totRestante_usd,
            total_linea_usd: totRestante_usd,
            total_linea_ves: totRestante_ves,
            fecha_actualizacion: new Date()
          }
        });

        const subtotalDevuelto_usd = qtyDevolver * Number(existing.precio_unitario_usd || existing.precio_unitario || 0);
        const subtotalDevuelto_ves = qtyDevolver * Number(existing.precio_unitario_ves || 0);
        const taxDevuelto_usd = subtotalDevuelto_usd * (pct_iva / 100);
        const taxDevuelto_ves = subtotalDevuelto_ves * (pct_iva / 100);
        const totDevuelto_usd = subtotalDevuelto_usd + taxDevuelto_usd;
        const totDevuelto_ves = subtotalDevuelto_ves + taxDevuelto_ves;

        const devueltoLine = await tx.compras_inventario.create({
          data: {
            proveedor_id: existing.proveedor_id,
            numero_factura: existing.numero_factura,
            fecha_compra: existing.fecha_compra,
            fecha_recibido: existing.fecha_recibido,
            item_id: existing.item_id,
            cantidad: qtyDevolver,
            precio_unitario: existing.precio_unitario,
            estado: 'devuelto',
            creado_por: existing.creado_por,
            tasa_cambio: existing.tasa_cambio,
            moneda_factura: existing.moneda_factura,
            precio_unitario_usd: existing.precio_unitario_usd,
            precio_unitario_ves: existing.precio_unitario_ves,
            porcentaje_impuesto: existing.porcentaje_impuesto,
            subtotal_usd: subtotalDevuelto_usd,
            subtotal_ves: subtotalDevuelto_ves,
            monto_impuesto_usd: taxDevuelto_usd,
            monto_impuesto_ves: taxDevuelto_ves,
            total_linea: totDevuelto_usd,
            total_linea_usd: totDevuelto_usd,
            total_linea_ves: totDevuelto_ves,
            fecha_creacion: new Date(),
            fecha_actualizacion: new Date()
          }
        });

        return {
          recibido: updatedOriginal,
          devuelto: devueltoLine
        };
      }
    });
  }
}

module.exports = new PurchasesService();
