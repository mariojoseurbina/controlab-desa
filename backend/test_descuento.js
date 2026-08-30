require('dotenv').config();
const { getPool, sql } = require('./config/db.js');

async function testDescuento() {
  const pool = await getPool();
  const fecha = new Date().toISOString().split('T')[0]; // or '2024-11-15' based on screenshot
  // Let's use '2024-11-15' since the screenshot shows 15/11/2024
  
  const pruebas = await pool.request()
    .input('fecha', sql.Date, '2024-11-15')
    .query(`
      SELECT 
        t.id,
        t.examen_nombre,
        t.cantidad,
        m.reactivo_id,
        r.nombre as reactivo_nombre,
        m.consumo_por_prueba
      FROM tmp_importacion_examenes t
      INNER JOIN mapeo_pruebas_reactivos m ON t.examen_nombre = m.nombre_prueba AND m.activo = 1
      INNER JOIN items_inventario r ON m.reactivo_id = r.id
      WHERE t.fecha = @fecha AND t.procesado = 0
    `);
    
  console.log("Pruebas encontradas:", pruebas.recordset);
  
  for (const prueba of pruebas.recordset) {
    const mlNecesarios = prueba.cantidad * prueba.consumo_por_prueba;
    console.log(`Prueba: ${prueba.examen_nombre}, ML Necesarios: ${mlNecesarios}`);
    const loteResult = await pool.request()
        .input('reactivoId', sql.Int, prueba.reactivo_id)
        .input('mlNecesarios', sql.Decimal(10,3), mlNecesarios)
        .query(`
          SELECT TOP 1 Id, NumeroLote, CantidadActual
          FROM LotesReactivos
          WHERE InventarioId = @reactivoId AND Estado = 'Activo' AND CantidadActual >= @mlNecesarios AND FechaVencimiento > GETDATE()
          ORDER BY FechaFabricacion ASC
        `);
    console.log("Lotes con stock suficiente:", loteResult.recordset);
  }
  process.exit(0);
}
testDescuento();
