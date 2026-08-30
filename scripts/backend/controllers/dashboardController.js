const sql = require('mssql');

const getDashboardMetrics = async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    const metricsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM items_inventario WHERE activo = 1) as total_items,
        (SELECT COUNT(*) FROM items_inventario WHERE stock_actual <= stock_critico AND activo = 1) as items_criticos,
        (SELECT COUNT(*) FROM items_inventario WHERE stock_actual <= stock_minimo AND activo = 1) as items_bajos,
        (SELECT COUNT(*) FROM movimientos_inventario WHERE CAST(fecha_movimiento AS DATE) = CAST(GETDATE() AS DATE)) as movimientos_hoy,
        (SELECT COUNT(*) FROM recetas) as total_recetas,
        (SELECT COUNT(*) FROM usuarios WHERE activo = 1) as total_usuarios
    `;

    const criticalStockQuery = `
      SELECT TOP 5 id, codigo, nombre, stock_actual, stock_minimo, stock_critico
      FROM items_inventario 
      WHERE stock_actual <= stock_critico AND activo = 1
      ORDER BY stock_actual ASC
    `;

    const metricsResult = await pool.request().query(metricsQuery);
    const criticalStockResult = await pool.request().query(criticalStockQuery);

    res.json({
      metrics: metricsResult.recordset[0],
      critical_stock: criticalStockResult.recordset
    });
  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    res.status(500).json({ error: 'Error obteniendo datos del dashboard' });
  }
};

module.exports = { getDashboardMetrics };