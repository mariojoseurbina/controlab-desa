const { sql, getPool } = require('../config/db');

class DashboardService {
  async getMetrics() {
    const pool = await getPool();
    
    // Consultas para las métricas principales
    const metricsResult = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM items_inventario WHERE activo = 1) as totalItems,
        (SELECT COUNT(*) FROM items_inventario WHERE stock_actual <= stock_critico AND activo = 1) as itemsCriticos,
        (SELECT COUNT(*) FROM items_inventario WHERE stock_actual <= stock_minimo AND stock_actual > stock_critico AND activo = 1) as itemsBajos,
        (SELECT COUNT(*) FROM movimientos_inventario WHERE CAST(fecha_movimiento AS DATE) = CAST(GETDATE() AS DATE)) as movimientosHoy,
        (SELECT COUNT(*) FROM reactivos) as totalReactivos
    `);

    let lotesMetrics = { totalLotes: 0, lotesActivos: 0, lotesVencidos: 0, rendimientoPromedio: 0 };
    try {
      const lotesMetricsResult = await pool.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM LotesReactivos) as totalLotes,
          (SELECT COUNT(*) FROM LotesReactivos WHERE Estado = 'Activo') as lotesActivos,
          (SELECT COUNT(*) FROM LotesReactivos WHERE Estado = 'Vencido') as lotesVencidos,
          (SELECT ISNULL(AVG(Rendimiento), 0) FROM LotesReactivos WHERE Rendimiento > 0) as rendimientoPromedio
      `);
      lotesMetrics = lotesMetricsResult.recordset[0];
    } catch (error) {
      console.error('Error en métricas de lotes (DashboardService):', error.message);
    }

    const alertsResult = await pool.request().query(`
      SELECT TOP 10 id, codigo, nombre, stock_actual, stock_minimo, stock_critico
      FROM items_inventario 
      WHERE activo = 1 AND stock_actual <= stock_minimo
      ORDER BY stock_actual ASC
    `);

    const movementsResult = await pool.request().query(`
      SELECT TOP 5 m.id, i.nombre, m.tipo_movimiento, m.cantidad, m.fecha_movimiento
      FROM movimientos_inventario m
      INNER JOIN items_inventario i ON m.item_id = i.id
      ORDER BY m.fecha_movimiento DESC
    `);

    let lotesAlerts = [];
    try {
      const lotesProximosResult = await pool.request().query(`
        SELECT TOP 3 
          lr.NumeroLote, ii.nombre as ItemNombre, lr.FechaVencimiento,
          DATEDIFF(DAY, GETDATE(), lr.FechaVencimiento) as DiasParaVencer
        FROM LotesReactivos lr
        INNER JOIN items_inventario ii ON lr.InventarioId = ii.id
        WHERE lr.Estado = 'Activo'
        AND lr.FechaVencimiento BETWEEN GETDATE() AND DATEADD(DAY, 30, GETDATE())
        ORDER BY lr.FechaVencimiento ASC
      `);
      lotesAlerts = lotesProximosResult.recordset || [];
    } catch (error) {
      console.error('Error en lotes próximos a vencer (DashboardService):', error.message);
    }

    return {
      metrics: { ...metricsResult.recordset[0], ...lotesMetrics },
      stockAlerts: alertsResult.recordset || [],
      recentMovements: movementsResult.recordset || [],
      lotesAlerts: lotesAlerts
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
