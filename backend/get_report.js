require('dotenv').config();
const { getPool, sql } = require('./config/db.js');

async function getReport() {
  const pool = await getPool();
  
  // Get current stock
  const stockResult = await pool.request().query(`
    SELECT i.nombre, i.codigo, i.stock_actual, SUM(l.CantidadActual) as stock_lotes
    FROM items_inventario i
    LEFT JOIN LotesReactivos l ON i.id = l.InventarioId AND l.Estado = 'Activo'
    WHERE i.activo = 1 AND i.categoria = 'Reactivo'
    GROUP BY i.nombre, i.codigo, i.stock_actual
    ORDER BY i.nombre
  `);

  // Get recent discounts
  const consumeResult = await pool.request().query(`
    SELECT i.nombre, SUM(m.cantidad) as total_descontado, MAX(m.fecha_movimiento) as ultimo_descuento
    FROM movimientos_inventario m
    INNER JOIN items_inventario i ON m.item_id = i.id
    WHERE m.tipo_movimiento = 'CONSUMO' AND CAST(m.fecha_movimiento as DATE) = CAST(GETDATE() as DATE)
    GROUP BY i.nombre
  `);

  console.log("=== STOCK ACTUAL ===");
  console.table(stockResult.recordset.filter(r => r.stock_lotes > 0 || r.stock_actual > 0));

  console.log("=== DESCUENTOS DE HOY ===");
  console.table(consumeResult.recordset);
  
  process.exit(0);
}
getReport();
