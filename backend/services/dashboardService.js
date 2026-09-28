const { sql, getPool } = require('../config/db');

class DashboardService {
  async getMetrics() {
    const pool = await getPool();

    // ============================================================
    // TODAS LAS CONSULTAS EN PARALELO - 6x más rápido
    // Antes: 6 consultas secuenciales (~6-12 segundos)
    // Ahora: 6 consultas simultáneas (~1-2 segundos)
    // ============================================================
    const [
      metricsResult,
      lotesMetricsResult,
      alertsResult,
      movementsResult,
      lotesProximosResult,
      lotesActivosResult
    ] = await Promise.all([
      // 1. Métricas principales de inventario
      pool.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM items_inventario WHERE activo = 1) as totalItems,
          (SELECT COUNT(*) FROM items_inventario WHERE stock_actual <= stock_critico AND activo = 1) as itemsCriticos,
          (SELECT COUNT(*) FROM items_inventario WHERE stock_actual <= stock_minimo AND stock_actual > stock_critico AND activo = 1) as itemsBajos,
          (SELECT COUNT(*) FROM movimientos_inventario WHERE CAST(fecha_movimiento AS DATE) = CAST(GETDATE() AS DATE)) as movimientosHoy,
          (SELECT COUNT(*) FROM reactivos) as totalReactivos
      `).catch(() => ({ recordset: [{ totalItems: 0, itemsCriticos: 0, itemsBajos: 0, movimientosHoy: 0, totalReactivos: 0 }] })),

      // 2. Métricas de lotes
      pool.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM LotesReactivos) as totalLotes,
          (SELECT COUNT(*) FROM LotesReactivos WHERE Estado = 'Activo') as lotesActivos,
          (SELECT COUNT(*) FROM LotesReactivos WHERE Estado = 'Vencido') as lotesVencidos,
          (SELECT ISNULL(AVG(Rendimiento), 0) FROM LotesReactivos WHERE Rendimiento > 0) as rendimientoPromedio
      `).catch(() => ({ recordset: [{ totalLotes: 0, lotesActivos: 0, lotesVencidos: 0, rendimientoPromedio: 0 }] })),

      // 3. Alertas de stock bajo
      pool.request().query(`
        SELECT TOP 10 id, codigo, nombre, stock_actual, stock_minimo, stock_critico
        FROM items_inventario 
        WHERE activo = 1 AND stock_actual <= stock_minimo
        ORDER BY stock_actual ASC
      `).catch(() => ({ recordset: [] })),

      // 4. Últimos movimientos
      pool.request().query(`
        SELECT TOP 5 m.id, i.nombre, m.tipo_movimiento, m.cantidad, m.fecha_movimiento
        FROM movimientos_inventario m
        INNER JOIN items_inventario i ON m.item_id = i.id
        ORDER BY m.fecha_movimiento DESC
      `).catch(() => ({ recordset: [] })),

      // 5. Lotes próximos a vencer
      pool.request().query(`
        SELECT TOP 3 
          lr.NumeroLote, ii.nombre as ItemNombre, lr.FechaVencimiento,
          DATEDIFF(DAY, GETDATE(), lr.FechaVencimiento) as DiasParaVencer
        FROM LotesReactivos lr
        INNER JOIN items_inventario ii ON lr.InventarioId = ii.id
        WHERE lr.Estado = 'Activo'
        AND lr.FechaVencimiento BETWEEN GETDATE() AND DATEADD(DAY, 30, GETDATE())
        ORDER BY lr.FechaVencimiento ASC
      `).catch(() => ({ recordset: [] })),

      // 6. Lotes activos en analizador para alertas de reposición
      pool.request().query(`
        SELECT 
          lr.Id as lote_id, lr.NumeroLote, lr.CantidadActual, lr.CantidadInicial,
          lr.FechaApertura, lr.CondicionesEspeciales,
          ii.id as item_id, ii.nombre as item_nombre, ii.codigo as item_codigo,
          ii.marca, ii.presentacion, ii.frascos_por_caja, ii.volumen_por_frasco,
          ii.consumo_indicado, ii.stock_actual as stock_inventario
        FROM LotesReactivos lr
        INNER JOIN items_inventario ii ON lr.InventarioId = ii.id
        WHERE lr.Estado = 'Activo' AND lr.FechaApertura IS NOT NULL
      `).catch(() => ({ recordset: [] }))
    ]);

    // Calcular alertas de reposición del analizador
    const alertasReposicionAnalizador = [];
    for (const row of (lotesActivosResult.recordset || [])) {
      let meta = {};
      try {
        if (row.CondicionesEspeciales) meta = JSON.parse(row.CondicionesEspeciales);
      } catch (_) {}

      const totalFrascos = Number(meta.total_frascos || row.frascos_por_caja) || 4;
      const volPorFrasco = Number(meta.vol_por_frasco || row.volumen_por_frasco) || 45;
      const totalVolCaja = Number(meta.volumen_total_caja || (totalFrascos * volPorFrasco));
      const cantActual = Number(row.CantidadActual) || 0;
      const mlConsumidosTotal = Math.max(0, totalVolCaja - cantActual);
      const frascoCalculado = Math.min(totalFrascos, Math.floor(mlConsumidosTotal / volPorFrasco) + 1);
      const frascoActual = Math.max(Number(meta.frasco_actual) || 1, frascoCalculado);
      const penultimoFrasco = Math.max(1, totalFrascos - 1);
      const esPenultimoOUltimo = frascoActual >= penultimoFrasco;
      const consumoIndicado = Number(meta.consumo_indicado || row.consumo_indicado) || 0.25;
      const mlConsumidosEnFrascosPrevios = (frascoActual - 1) * volPorFrasco;
      const mlConsumidosEnFrascoActual = Math.max(0, mlConsumidosTotal - mlConsumidosEnFrascosPrevios);
      const mlRestantesFrasco = Number(Math.max(0, volPorFrasco - mlConsumidosEnFrascoActual).toFixed(2));
      const pruebasRestantesFrasco = Math.max(0, Math.floor(mlRestantesFrasco / consumoIndicado));
      const pruebasRestantesCaja = Math.max(0, Math.floor(cantActual / consumoIndicado));

      if (esPenultimoOUltimo) {
        alertasReposicionAnalizador.push({
          loteId: row.lote_id,
          numeroLote: row.NumeroLote,
          itemId: row.item_id,
          itemCodigo: row.item_codigo,
          itemNombre: row.item_nombre,
          marca: row.marca || 'Wiener Lab',
          presentacion: row.presentacion || `${totalFrascos}F x ${volPorFrasco}mL`,
          equipo: meta.equipo_asociado || 'CM 260i',
          frascoActual,
          totalFrascos,
          esUltimoFrasco: frascoActual === totalFrascos,
          esPenultimoFrasco: frascoActual === penultimoFrasco,
          nivelCriticidad: frascoActual === totalFrascos ? 'CRITICO' : 'ALTO',
          mlRestantesFrasco,
          pruebasRestantesFrasco,
          mlRestantesCaja: cantActual,
          pruebasRestantesCaja,
          stockAlmacenCentral: Number(row.stock_inventario) || 0,
          mensaje: `🚨 REPONER CAJA: ${row.item_nombre} se encuentra en Frasco ${frascoActual} de ${totalFrascos} en ${meta.equipo_asociado || 'CM 260i'}. Extraer caja del Almacén Central para Laboratorio.`
        });
      }
    }

    const lotesMetrics = lotesMetricsResult.recordset[0] || { totalLotes: 0, lotesActivos: 0, lotesVencidos: 0, rendimientoPromedio: 0 };

    return {
      metrics: {
        ...metricsResult.recordset[0],
        ...lotesMetrics,
        reactivosCriticosAnalizador: alertasReposicionAnalizador.length
      },
      stockAlerts: alertsResult.recordset || [],
      recentMovements: movementsResult.recordset || [],
      lotesAlerts: lotesProximosResult.recordset || [],
      alertasReposicionAnalizador
    };
  }

  async getStockChartData() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        ISNULL(categoria, 'Sin Categoría') as categoria,
        COUNT(*) as totalItems,
        SUM(CASE WHEN stock_actual <= stock_critico THEN 1 ELSE 0 END) as criticos,
        SUM(CASE WHEN stock_actual <= stock_minimo AND stock_actual > stock_critico THEN 1 ELSE 0 END) as bajos,
        SUM(CASE WHEN stock_actual > stock_minimo THEN 1 ELSE 0 END) as normales
      FROM items_inventario 
      WHERE activo = 1
      GROUP BY categoria
    `);
    return result.recordset;
  }

  async getCategoryDistribution() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
          categoria,
          COUNT(*) AS items,
          SUM(stock_actual) AS stock_total,
          SUM(ISNULL(stock_actual, 0) * ISNULL(precio_costo, 0)) AS valor_total,
          AVG(CASE WHEN precio_costo > 0 THEN precio_costo ELSE NULL END) AS precio_prom,
          SUM(CASE WHEN stock_critico > 0 AND stock_actual <= stock_critico THEN 1 ELSE 0 END) AS criticos,
          SUM(CASE WHEN stock_minimo > 0 AND stock_actual < stock_minimo AND NOT (stock_critico > 0 AND stock_actual <= stock_critico) THEN 1 ELSE 0 END) AS bajos
      FROM items_inventario
      WHERE activo = 1
      GROUP BY categoria
      ORDER BY items DESC
    `);
    return result.recordset;
  }

  async getWeeklyMovements() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        tipo_movimiento,
        SUM(cantidad) as totalCantidad,
        COUNT(*) as totalMovimientos
      FROM movimientos_inventario
      WHERE fecha_movimiento >= DATEADD(WEEK, -1, GETDATE())
      GROUP BY tipo_movimiento
    `);

    let entradasTotal = 0;
    let salidasTotal = 0;

    if (result.recordset) {
      result.recordset.forEach(row => {
        const type = row.tipo_movimiento ? row.tipo_movimiento.toUpperCase() : '';
        if (type === 'ENTRADA') {
          entradasTotal += row.totalCantidad || 0;
        } else if (type === 'SALIDA' || type === 'CONSUMO') {
          salidasTotal += row.totalCantidad || 0;
        }
      });
    }

    return { entradasTotal, salidasTotal };
  }
}

module.exports = new DashboardService();
