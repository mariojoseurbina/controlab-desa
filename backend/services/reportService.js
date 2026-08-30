const { getPool } = require('../config/db');
const XLSX = require('xlsx');

class ReportService {
  async getPreciosInventario() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        id, codigo, nombre, descripcion, categoria, unidad, marca,
        stock_actual, stock_minimo, stock_maximo, stock_critico,
        proveedor, precio_costo, precio_venta, ubicacion,
        (precio_venta - precio_costo) as margen_ganancia,
        ROUND(((precio_venta - precio_costo) / NULLIF(precio_costo, 0)) * 100, 2) as margen_porcentaje,
        CASE 
          WHEN stock_actual <= stock_critico THEN 'CRÍTICO'
          WHEN stock_actual <= stock_minimo THEN 'BAJO' 
          ELSE 'NORMAL'
        END as estado_stock
      FROM items_inventario 
      WHERE activo = 1
      ORDER BY categoria, nombre
    `);
    
    const totales = result.recordset.reduce((acc, item) => ({
      valorCosto: acc.valorCosto + (item.precio_costo * item.stock_actual),
      valorVenta: acc.valorVenta + (item.precio_venta * item.stock_actual),
      itemsCriticos: acc.itemsCriticos + (item.stock_actual <= item.stock_critico ? 1 : 0)
    }), { valorCosto: 0, valorVenta: 0, itemsCriticos: 0 });

    return { items: result.recordset, totales };
  }

  async getPreciosResumen() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        categoria, COUNT(*) as total_items,
        AVG(precio_costo) as precio_costo_promedio,
        AVG(precio_venta) as precio_venta_promedio,
        SUM(precio_costo * stock_actual) as valor_inventario_costo,
        SUM(precio_venta * stock_actual) as valor_inventario_venta
      FROM items_inventario 
      WHERE activo = 1
      GROUP BY categoria
      ORDER BY valor_inventario_costo DESC
    `);
    return result.recordset;
  }

  async getReactivosLotes() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        i.id as ReactivoId, i.nombre as Reactivo, i.codigo as Codigo,
        i.descripcion as Descripcion, i.unidad as Unidad, i.marca as Marca,
        i.stock_actual as StockActual, i.stock_minimo as StockMinimo,
        i.stock_maximo as StockMaximo, i.proveedor as Proveedor,
        lr.Id as LoteId, lr.NumeroLote, lr.CantidadActual,
        lr.ConsumoPorPrueba, lr.FechaVencimiento, lr.FechaFabricacion,
        lr.PruebasTeoricas, lr.PruebasRestantes, lr.Rendimiento,
        lr.TemperaturaAlmacenamiento, lr.Estado,
        DATEDIFF(DAY, GETDATE(), lr.FechaVencimiento) as DiasParaVencer,
        CASE 
          WHEN lr.Rendimiento >= 95 THEN 'EXCELENTE'
          WHEN lr.Rendimiento >= 85 THEN 'ÓPTIMO' 
          WHEN lr.Rendimiento >= 75 THEN 'ACEPTABLE'
          ELSE 'MEJORABLE'
        END as NivelRendimiento,
        CASE 
          WHEN DATEDIFF(DAY, GETDATE(), lr.FechaVencimiento) < 0 THEN 'VENCIDO'
          WHEN DATEDIFF(DAY, GETDATE(), lr.FechaVencimiento) < 30 THEN 'POR VENCER'
          ELSE 'VIGENTE'
        END as EstadoVencimiento
      FROM LotesReactivos lr
      INNER JOIN items_inventario i ON lr.InventarioId = i.id
      WHERE (i.activo = 1 OR i.activo IS NULL) 
        AND (i.categoria LIKE '%Reactivo%' OR i.categoria LIKE '%reactivo%')
      ORDER BY i.nombre, lr.FechaVencimiento ASC
    `);

    const reactivosMap = {};
    let totalReactivos = 0, totalLotes = 0, totalStock = 0, lotesVencidos = 0, lotesPorVencer = 0;

    result.recordset.forEach(row => {
      if (!reactivosMap[row.ReactivoId]) {
        reactivosMap[row.ReactivoId] = {
          nombre: row.Reactivo, codigo: row.Codigo, unidad: row.Unidad, marca: row.Marca,
          stock_actual: row.StockActual, stock_minimo: row.StockMinimo,
          lotes: [], stockTotalLotes: 0, pruebasTeoricasTotales: 0, pruebasRestantesTotales: 0
        };
        totalReactivos++;
      }

      const pruebasTeoricas = row.PruebasTeoricas || 
        (row.ConsumoPorPrueba > 0 ? Math.floor(row.CantidadActual / row.ConsumoPorPrueba) : 0);
      const pruebasRestantes = row.PruebasRestantes || 
        (row.ConsumoPorPrueba > 0 ? Math.floor(row.CantidadActual / row.ConsumoPorPrueba) : 0);

      reactivosMap[row.ReactivoId].lotes.push({
        numeroLote: row.NumeroLote, cantidadActual: row.CantidadActual,
        consumoPorPrueba: row.ConsumoPorPrueba, fechaVencimiento: row.FechaVencimiento,
        fechaFabricacion: row.FechaFabricacion, pruebasTeoricas, pruebasRestantes,
        rendimiento: row.Rendimiento, nivelRendimiento: row.NivelRendimiento,
        estado: row.Estado, diasParaVencer: row.DiasParaVencer, estadoVencimiento: row.EstadoVencimiento
      });

      reactivosMap[row.ReactivoId].stockTotalLotes += row.CantidadActual;
      reactivosMap[row.ReactivoId].pruebasTeoricasTotales += pruebasTeoricas;
      reactivosMap[row.ReactivoId].pruebasRestantesTotales += pruebasRestantes;

      totalLotes++;
      totalStock += row.CantidadActual;

      if (row.DiasParaVencer < 0) lotesVencidos++;
      if (row.DiasParaVencer >= 0 && row.DiasParaVencer < 30) lotesPorVencer++;
    });

    const reactivosFormateados = Object.values(reactivosMap).map(reactivo => ({
      ...reactivo,
      lotes: reactivo.lotes.map(lote => ({
        ...lote,
        fechaVencimiento: lote.fechaVencimiento ? new Date(lote.fechaVencimiento).toISOString().split('T')[0] : null,
        fechaFabricacion: lote.fechaFabricacion ? new Date(lote.fechaFabricacion).toISOString().split('T')[0] : null
      }))
    }));

    return {
      reactivos: reactivosFormateados,
      resumen: {
        totalReactivos, totalLotes, totalStock, lotesVencidos, lotesPorVencer,
        lotesVigentes: totalLotes - lotesVencidos - lotesPorVencer
      }
    };
  }

  generateExcelBuffer(data, sheetName = "Reporte") {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async getPreciosExcelBuffer() {
    const data = await this.getPreciosInventario();
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data.items);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lista de Precios");

    const totalCosto = data.totales.valorCosto;
    const totalVenta = data.totales.valorVenta;
    const gananciaPotencial = totalVenta - totalCosto;

    const resumenData = [
      { 'METRICA': 'Valor total en costo', 'VALOR': `$${totalCosto.toFixed(2)}` },
      { 'METRICA': 'Valor total en venta', 'VALOR': `$${totalVenta.toFixed(2)}` },
      { 'METRICA': 'Ganancia potencial', 'VALOR': `$${gananciaPotencial.toFixed(2)}` },
      { 'METRICA': 'Total items', 'VALOR': data.items.length },
      { 'METRICA': 'Items con stock crítico', 'VALOR': data.totales.itemsCriticos }
    ];
    
    const resumenSheet = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen");

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = new ReportService();
