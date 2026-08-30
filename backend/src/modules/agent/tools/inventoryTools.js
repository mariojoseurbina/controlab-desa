const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // O importarlo de tu core si existe

/**
 * Obtiene un resumen de ítems del inventario, opcionalmente filtrando por stock bajo.
 */
async function checkInventory({ filterLowStock = false, category = null }) {
  try {
    let whereClause = { activo: true };
    if (category) {
      whereClause.categoria = { contains: category };
    }

    const items = await prisma.itemInventario.findMany({
      where: whereClause,
      select: {
        codigo: true,
        nombre: true,
        categoria: true,
        stock_actual: true,
        stock_minimo: true,
        stock_critico: true,
        usuarios: {
          select: { nombre_completo: true, usuario: true }
        }
      }
    });

    const formattedItems = items.map(i => ({
      codigo: i.codigo,
      nombre: i.nombre,
      categoria: i.categoria,
      stockActual: i.stock_actual,
      stockMinimo: i.stock_minimo,
      stockCritico: i.stock_critico,
      registradoPor: i.usuarios ? i.usuarios.nombre_completo || i.usuarios.usuario : 'Desconocido'
    }));

    if (filterLowStock) {
      return formattedItems.filter(i => i.stockActual <= i.stockMinimo);
    }
    return formattedItems;
  } catch (error) {
    console.error("Error en checkInventory tool:", error);
    return { error: error.message };
  }
}

/**
 * Consulta lotes de reactivos que están próximos a vencer.
 */
async function checkExpiringLots({ daysUntilExpiration = 30 }) {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysUntilExpiration);

    const lots = await prisma.lotesReactivos.findMany({
      where: {
        FechaVencimiento: {
          lte: futureDate
        },
        CantidadActual: {
          gt: 0
        }
      },
      include: {
        items_inventario: {
          select: { nombre: true, codigo: true, unidad: true }
        }
      },
      orderBy: {
        FechaVencimiento: 'asc'
      }
    });

    return lots.map(lot => ({
      reactivo: lot.items_inventario?.nombre,
      codigo: lot.items_inventario?.codigo,
      lote: lot.NumeroLote,
      fechaVencimiento: lot.FechaVencimiento,
      cantidadRestante: lot.CantidadActual,
      unidad: lot.items_inventario?.unidad
    }));
  } catch (error) {
    console.error("Error en checkExpiringLots tool:", error);
    return { error: error.message };
  }
}

/**
 * Consulta las compras más recientes, con opción de filtrar por proveedor.
 */
async function checkRecentPurchases({ limit = 5, proveedorName = null }) {
  try {
    let whereClause = {};

    // Si la IA envía un nombre de proveedor, buscamos su ID primero
    if (proveedorName) {
      const proveedor = await prisma.proveedores.findFirst({
        where: { nombre: { contains: proveedorName } }
      });
      
      if (proveedor) {
        whereClause.proveedor_id = proveedor.id;
      } else {
        return { error: `No se encontró ningún proveedor que coincida con "${proveedorName}".` };
      }
    }

    const limitNum = parseInt(limit, 10) || 5;

    const purchases = await prisma.compras_inventario.findMany({
      where: whereClause,
      orderBy: {
        fecha_creacion: 'desc'
      },
      take: limitNum
    });
    
    // Obtener nombres reales de items y proveedores
    const formattedPurchases = [];
    for (const p of purchases) {
      let itemName = `Item ID ${p.item_id}`;
      let provName = `Proveedor ID ${p.proveedor_id}`;

      if (p.item_id) {
        const item = await prisma.itemInventario.findUnique({ where: { id: p.item_id } });
        if (item) itemName = item.nombre;
      }
      
      if (p.proveedor_id) {
        const prov = await prisma.proveedores.findUnique({ where: { id: p.proveedor_id } });
        if (prov) provName = prov.nombre;
      }

      formattedPurchases.push({
        numeroFactura: p.numero_factura,
        fechaCompra: p.fecha_compra,
        item: itemName,
        proveedor: provName,
        cantidad: p.cantidad,
        precioUnitario: p.precio_unitario,
        total: p.total_linea,
        estado: p.estado,
        moneda: p.moneda_factura,
        registradoPor: p.creado_por || 'Desconocido'
      });
    }

    return formattedPurchases;
  } catch (error) {
    console.error("Error en checkRecentPurchases tool:", error);
    return { error: error.message };
  }
}

/**
 * Calcula el ritmo de consumo diario y los días de autonomía proyectados.
 */
async function checkConsumptionRate({ category = null, days = 30 }) {
  try {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);

    // 1. Obtener todos los movimientos de los últimos 'days' días
    const movimientos = await prisma.movimientoInventario.findMany({
      where: {
        fecha_movimiento: { gte: pastDate }
      }
    });

    // 2. Sumar el consumo (todo movimiento donde el stock disminuyó)
    const consumoTotal = {};
    for (const mov of movimientos) {
      const decrement = Number(mov.stock_anterior) - Number(mov.stock_nuevo);
      if (decrement > 0) { // Fue una salida/consumo
        if (!consumoTotal[mov.item_id]) consumoTotal[mov.item_id] = 0;
        consumoTotal[mov.item_id] += decrement;
      }
    }

    // 3. Obtener el catálogo de ítems (filtrando por categoría si aplica)
    let itemsWhere = { activo: true };
    if (category) {
      itemsWhere.categoria = { contains: category };
    }
    const items = await prisma.itemInventario.findMany({
      where: itemsWhere,
      select: { id: true, nombre: true, categoria: true, stock_actual: true, unidad: true }
    });

    const results = [];
    for (const item of items) {
      const consumo = consumoTotal[item.id] || 0;
      const consumoDiario = consumo / days;
      const stockActual = Number(item.stock_actual) || 0;
      
      let diasAutonomia = 'Infinito (Sin consumo reciente)';
      if (consumoDiario > 0) {
        diasAutonomia = (stockActual / consumoDiario).toFixed(1);
      } else if (stockActual === 0) {
        diasAutonomia = '0 (Sin stock)';
      }

      results.push({
        item: item.nombre,
        categoria: item.categoria,
        unidad: item.unidad,
        stockActual: stockActual,
        consumoUltimosDias: consumo,
        consumoDiarioPromedio: parseFloat(consumoDiario.toFixed(2)),
        diasAutonomiaProyectados: diasAutonomia
      });
    }

    return results;
  } catch (error) {
    console.error("Error en checkConsumptionRate tool:", error);
    return { error: error.message };
  }
}

/**
 * Pregunta 3: Valor financiero del inventario inmovilizado.
 */
async function checkInventoryValue() {
  try {
    const items = await prisma.itemInventario.findMany({
      where: { activo: true },
      select: { nombre: true, categoria: true, stock_actual: true, precio_costo: true }
    });

    let totalGlobal = 0;
    const categorias = {};

    items.forEach(i => {
      const stock = Number(i.stock_actual) || 0;
      const costo = Number(i.precio_costo) || 0;
      const valor = stock * costo;
      totalGlobal += valor;

      if (!categorias[i.categoria]) categorias[i.categoria] = 0;
      categorias[i.categoria] += valor;
    });

    return {
      valorTotalInmovilizado: parseFloat(totalGlobal.toFixed(2)),
      desglosePorCategoria: categorias
    };
  } catch (error) {
    console.error("Error en checkInventoryValue:", error);
    return { error: error.message };
  }
}

/**
 * Preguntas 5 y 6: Top Consumos e incrementos inusuales
 */
async function getTopConsumptions({ days = 7, limit = 5 }) {
  try {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);

    const movimientos = await prisma.movimientoInventario.findMany({
      where: { fecha_movimiento: { gte: pastDate } }
    });

    const consumo = {};
    for (const mov of movimientos) {
      const decrement = Number(mov.stock_anterior) - Number(mov.stock_nuevo);
      if (decrement > 0) {
        if (!consumo[mov.item_id]) consumo[mov.item_id] = 0;
        consumo[mov.item_id] += decrement;
      }
    }

    const sortedIds = Object.keys(consumo).sort((a, b) => consumo[b] - consumo[a]).slice(0, limit);
    const results = [];
    for (const id of sortedIds) {
      const item = await prisma.itemInventario.findUnique({ where: { id: Number(id) } });
      if (item) {
        results.push({
          item: item.nombre,
          cantidadConsumida: parseFloat(consumo[id].toFixed(2)),
          stockRestante: Number(item.stock_actual) || 0,
          diasAnalizados: days
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error en getTopConsumptions:", error);
    return { error: error.message };
  }
}

/**
 * Pregunta 7: Detectar sobrecompra (stock > máximo)
 */
async function checkOverstock() {
  try {
    const items = await prisma.itemInventario.findMany({
      where: { activo: true },
      select: { nombre: true, categoria: true, stock_actual: true, stock_maximo: true }
    });

    const overstocked = items.filter(i => {
      const actual = Number(i.stock_actual) || 0;
      const maximo = Number(i.stock_maximo) || 0;
      return maximo > 0 && actual > maximo;
    }).map(i => ({
      item: i.nombre,
      categoria: i.categoria,
      stockActual: Number(i.stock_actual),
      stockMaximoPermitido: Number(i.stock_maximo),
      exceso: parseFloat((Number(i.stock_actual) - Number(i.stock_maximo)).toFixed(2))
    }));

    return { totalItemsConSobrecompra: overstocked.length, detalle: overstocked };
  } catch (error) {
    console.error("Error en checkOverstock:", error);
    return { error: error.message };
  }
}

/**
 * Pregunta 8: Proporciones de inventario por categoría
 */
async function checkInventoryProportions() {
  try {
    const items = await prisma.itemInventario.findMany({
      where: { activo: true },
      select: { categoria: true, stock_actual: true }
    });

    let totalStock = 0;
    const proporciones = {};

    items.forEach(i => {
      const stock = Number(i.stock_actual) || 0;
      totalStock += stock;
      if (!proporciones[i.categoria]) proporciones[i.categoria] = 0;
      proporciones[i.categoria] += stock;
    });

    const resultados = Object.keys(proporciones).map(cat => ({
      categoria: cat,
      cantidadTotalItems: parseFloat(proporciones[cat].toFixed(2)),
      porcentajeDelTotal: totalStock > 0 ? parseFloat(((proporciones[cat] / totalStock) * 100).toFixed(2)) + '%' : '0%'
    }));

    return { stockTotalGlobal: parseFloat(totalStock.toFixed(2)), proporciones: resultados };
  } catch (error) {
    console.error("Error en checkInventoryProportions:", error);
    return { error: error.message };
  }
}

/**
 * Pregunta 9: Discrepancias teóricas vs reales
 */
async function checkDiscrepancies() {
  try {
    const lotes = await prisma.lotesReactivos.findMany({
      where: { Estado: 'Activo' },
      include: { items_inventario: { select: { nombre: true, unidad: true } } }
    });

    const discrepancias = lotes.map(l => {
      const reactivo = l.items_inventario?.nombre || 'Desconocido';
      const unidad = l.items_inventario?.unidad || 'ml';
      const teorico = Number(l.VolumenTrabajoTeorico) || 0;
      const real = Number(l.CantidadActual) || 0;
      
      return {
        lote: l.NumeroLote,
        reactivo: reactivo,
        unidadMedida: unidad,
        volumenTeoricoRestante: parseFloat(teorico.toFixed(2)),
        volumenRealFisico: parseFloat(real.toFixed(2)),
        diferenciaMermas: parseFloat((teorico - real).toFixed(2))
      };
    });

    return discrepancias.filter(d => d.diferenciaMermas > 0);
  } catch (error) {
    console.error("Error en checkDiscrepancies:", error);
    return { error: error.message };
  }
}

/**
 * Preguntas 12 y 14: Pérdida financiera por lotes vencidos o por vencer
 */
async function checkExpiringFinancialLoss({ daysUntilExpiration = 30 }) {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysUntilExpiration);

    const lotes = await prisma.lotesReactivos.findMany({
      where: {
        FechaVencimiento: { lte: futureDate },
        CantidadActual: { gt: 0 }
      },
      include: {
        items_inventario: { select: { nombre: true, precio_costo: true, unidad: true } }
      }
    });

    let totalLoss = 0;
    const details = lotes.map(l => {
      const costo = Number(l.items_inventario?.precio_costo) || 0;
      const cant = Number(l.CantidadActual) || 0;
      const perdida = costo * cant;
      totalLoss += perdida;
      
      return {
        reactivo: l.items_inventario?.nombre,
        lote: l.NumeroLote,
        fechaVencimiento: l.FechaVencimiento,
        cantidadEnRiesgo: cant,
        unidad: l.items_inventario?.unidad,
        perdidaEconomicaEstimada: parseFloat(perdida.toFixed(2))
      };
    });

    return { 
      perdidaTotalProyectada: parseFloat(totalLoss.toFixed(2)), 
      lotesAfectados: details 
    };
  } catch (error) {
    console.error("Error en checkExpiringFinancialLoss:", error);
    return { error: error.message };
  }
}

/**
 * Preguntas 15 y 20: Lotes vencidos pero marcados como activos
 */
async function checkExpiredActiveLots() {
  try {
    const today = new Date();
    const lotes = await prisma.lotesReactivos.findMany({
      where: {
        Estado: 'Activo',
        FechaVencimiento: { lt: today },
        CantidadActual: { gt: 0 }
      },
      include: { items_inventario: { select: { nombre: true } } }
    });

    return lotes.map(l => ({
      reactivo: l.items_inventario?.nombre,
      lote: l.NumeroLote,
      fechaVencimiento: l.FechaVencimiento,
      cantidadRestante: Number(l.CantidadActual)
    }));
  } catch (error) {
    console.error("Error en checkExpiredActiveLots:", error);
    return { error: error.message };
  }
}

/**
 * Pregunta 18: Motivos de mermas (daño vs vencimiento)
 */
async function checkShrinkageCauses({ days = 90 }) {
  try {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);

    const movimientos = await prisma.movimientoInventario.findMany({
      where: { 
        fecha_movimiento: { gte: pastDate }
      }
    });

    const causas = {};
    movimientos.forEach(m => {
      // Filtrar solo salidas que no sean consumo normal
      const tipo = (m.tipo_movimiento || '').toUpperCase();
      if (tipo === 'MERMA' || tipo === 'DESCARGO' || tipo === 'DAÑO' || tipo === 'VENCIMIENTO') {
        const motivo = m.motivo || tipo;
        const cantidad = Number(m.stock_anterior) - Number(m.stock_nuevo);
        if (cantidad > 0) {
          if (!causas[motivo]) causas[motivo] = 0;
          causas[motivo] += cantidad;
        }
      }
    });

    return {
      diasAnalizados: days,
      desgloseMermas: causas
    };
  } catch (error) {
    console.error("Error en checkShrinkageCauses:", error);
    return { error: error.message };
  }
}

/**
 * Pregunta 19: Promedio de días en almacén
 */
async function checkAverageStorageDays() {
  try {
    const lotes = await prisma.lotesReactivos.findMany({
      where: { CantidadActual: { lte: 0 } }
    });

    if (lotes.length === 0) return { mensaje: "No hay datos suficientes de lotes consumidos al 100%." };

    let totalDays = 0;
    let count = 0;

    lotes.forEach(l => {
      if (l.FechaRegistro && l.FechaActualizacion) {
        const diffTime = Math.abs(l.FechaActualizacion - l.FechaRegistro);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalDays += diffDays;
        count++;
      }
    });

    const avg = count > 0 ? (totalDays / count).toFixed(1) : 0;
    return { promedioDiasAlmacenadosAntesDeAgotarse: parseFloat(avg) };
  } catch (error) {
    console.error("Error en checkAverageStorageDays:", error);
    return { error: error.message };
  }
}

/**
 * Preguntas 23 y 28: Variación e inflación de precios
 */
async function checkPriceVariation({ itemId = null }) {
  try {
    const compras = await prisma.compras_inventario.findMany({
      where: itemId ? { item_id: Number(itemId) } : {},
      orderBy: { fecha_compra: 'asc' },
      take: 200
    });

    if (compras.length === 0) return { mensaje: "No hay historial de compras." };

    const variaciones = {};
    for (const c of compras) {
      if (!c.item_id || !c.precio_unitario) continue;
      
      if (!variaciones[c.item_id]) {
        const item = await prisma.itemInventario.findUnique({ where: { id: c.item_id } });
        variaciones[c.item_id] = {
          item: item?.nombre || `Item ${c.item_id}`,
          precioMasAntiguo: Number(c.precio_unitario),
          precioMasReciente: Number(c.precio_unitario)
        };
      } else {
        variaciones[c.item_id].precioMasReciente = Number(c.precio_unitario);
      }
    }

    const resultado = Object.values(variaciones).map(v => {
      const diff = v.precioMasReciente - v.precioMasAntiguo;
      const porcentaje = v.precioMasAntiguo > 0 ? (diff / v.precioMasAntiguo) * 100 : 0;
      return {
        item: v.item,
        precioInicial: v.precioMasAntiguo,
        precioActual: v.precioMasReciente,
        variacionMonetaria: parseFloat(diff.toFixed(2)),
        porcentajeVariacion: parseFloat(porcentaje.toFixed(2)) + '%'
      };
    });

    return resultado.filter(r => r.variacionMonetaria !== 0);
  } catch (error) {
    console.error("Error en checkPriceVariation:", error);
    return { error: error.message };
  }
}

/**
 * Preguntas 24, 25, 27: Inteligencia de Proveedores
 */
async function checkSupplierPerformance() {
  try {
    // Buscamos todas las compras (recibidas o no para ver gastos y tiempos)
    const compras = await prisma.compras_inventario.findMany();

    const proveedores = {};

    for (const c of compras) {
      if (!c.proveedor_id) continue;
      
      if (!proveedores[c.proveedor_id]) {
        const prov = await prisma.proveedores.findUnique({ where: { id: c.proveedor_id } });
        proveedores[c.proveedor_id] = {
          nombre: prov?.nombre || `Proveedor ${c.proveedor_id}`,
          totalPagado: 0,
          entregas: 0,
          diasRetrasoTotales: 0
        };
      }

      proveedores[c.proveedor_id].totalPagado += Number(c.total_linea) || 0;
      
      if (c.fecha_compra && c.fecha_recibido) {
        const diffTime = Math.abs(c.fecha_recibido - c.fecha_compra);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        proveedores[c.proveedor_id].diasRetrasoTotales += diffDays;
        proveedores[c.proveedor_id].entregas++;
      }
    }

    return Object.values(proveedores).map(p => ({
      proveedor: p.nombre,
      gastoTotalHistorico: parseFloat(p.totalPagado.toFixed(2)),
      promedioDiasRetrasoEntrega: p.entregas > 0 ? parseFloat((p.diasRetrasoTotales / p.entregas).toFixed(1)) : 0
    }));
  } catch (error) {
    console.error("Error en checkSupplierPerformance:", error);
    return { error: error.message };
  }
}

/**
 * Pregunta 30: Compras pendientes de recibir
 */
async function checkPendingPurchases() {
  try {
    const compras = await prisma.compras_inventario.findMany({
      where: { estado: { in: ['Pendiente', 'PENDIENTE', 'pendiente'] } }
    });

    const today = new Date();
    const resultados = [];

    for (const c of compras) {
      let itemName = `Item ID ${c.item_id}`;
      let provName = `Proveedor ID ${c.proveedor_id}`;

      if (c.item_id) {
        const item = await prisma.itemInventario.findUnique({ where: { id: c.item_id } });
        if (item) itemName = item.nombre;
      }
      if (c.proveedor_id) {
        const prov = await prisma.proveedores.findUnique({ where: { id: c.proveedor_id } });
        if (prov) provName = prov.nombre;
      }

      let diasEsperando = 0;
      if (c.fecha_compra) {
        const diffTime = Math.abs(today - c.fecha_compra);
        diasEsperando = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      resultados.push({
        numeroFactura: c.numero_factura,
        proveedor: provName,
        item: itemName,
        cantidad: Number(c.cantidad),
        fechaSolicitud: c.fecha_compra,
        diasEsperando: diasEsperando
      });
    }

    return resultados;
  } catch (error) {
    console.error("Error en checkPendingPurchases:", error);
    return { error: error.message };
  }
}

/**
 * Obtiene el registro detallado de movimientos (entradas/salidas) con usuarios.
 */
async function getRecentMovements({ filterType = 'ALL', days = 30, targetMonth = null, almacenId = null }) {
  try {
    let whereClause = {};

    if (targetMonth) {
      const year = new Date().getFullYear();
      const startDate = new Date(year, targetMonth - 1, 1);
      const endDate = new Date(year, targetMonth, 0, 23, 59, 59, 999);
      whereClause.fecha_movimiento = { gte: startDate, lte: endDate };
    } else {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - days);
      whereClause.fecha_movimiento = { gte: pastDate };
    }

    if (almacenId) {
      whereClause.OR = [
        { almacen_id: parseInt(almacenId) },
        { almacen_destino_id: parseInt(almacenId) }
      ];
    }

    const movimientos = await prisma.movimientoInventario.findMany({
      where: whereClause,
      orderBy: { fecha_movimiento: 'desc' },
      take: 100
    });

    const resultados = [];
    for (const mov of movimientos) {
      const isSalida = Number(mov.stock_anterior) > Number(mov.stock_nuevo);
      const isEntrada = Number(mov.stock_anterior) < Number(mov.stock_nuevo);
      
      if (filterType === 'OUT' && !isSalida) continue;
      if (filterType === 'IN' && !isEntrada) continue;

      let usuarioNombre = `Usuario ID ${mov.creado_por}`;
      if (mov.creado_por) {
        const u = await prisma.usuarios.findUnique({ where: { id: mov.creado_por } });
        if (u) usuarioNombre = u.nombre_completo || u.usuario;
      }

      let itemNombre = `Item ID ${mov.item_id}`;
      if (mov.item_id) {
        const item = await prisma.itemInventario.findUnique({ where: { id: mov.item_id } });
        if (item) itemNombre = item.nombre;
      }

      let origenNombre = mov.almacen_id ? (await prisma.almacen.findUnique({ where: { id: mov.almacen_id } }))?.nombre : 'N/A';
      let destinoNombre = mov.almacen_destino_id ? (await prisma.almacen.findUnique({ where: { id: mov.almacen_destino_id } }))?.nombre : 'N/A';

      resultados.push({
        tipo: isSalida ? 'SALIDA' : (isEntrada ? 'ENTRADA' : (mov.tipo_movimiento || 'AJUSTE')),
        item: itemNombre,
        cantidad: Math.abs(Number(mov.stock_anterior) - Number(mov.stock_nuevo)) || Number(mov.cantidad) || 0,
        fecha: mov.fecha_movimiento,
        usuario: usuarioNombre,
        motivo: mov.motivo || mov.tipo_movimiento,
        origen: origenNombre || 'N/A',
        destino: destinoNombre || 'N/A'
      });
    }

    return resultados;
  } catch (error) {
    console.error("Error en getRecentMovements:", error);
    return { error: error.message };
  }
}

module.exports = {
  checkInventory,
  checkExpiringLots,
  checkRecentPurchases,
  checkConsumptionRate,
  checkInventoryValue,
  getTopConsumptions,
  checkOverstock,
  checkInventoryProportions,
  checkDiscrepancies,
  checkExpiringFinancialLoss,
  checkExpiredActiveLots,
  checkShrinkageCauses,
  checkAverageStorageDays,
  checkPriceVariation,
  checkSupplierPerformance,
  checkPendingPurchases,
  getRecentMovements
};
