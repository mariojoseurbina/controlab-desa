require('dotenv').config();
const { getPool } = require('./config/db');

async function checkTables() {
  const pool = await getPool();
  const tables = [
    'items_inventario',
    'movimientos_inventario',
    'LotesReactivos',
    'compras_inventario',
    'log_sniffer',
    'mapeo_pruebas_reactivos',
    'pruebas_maestra',
    'vinculo_prueba_item',
    'gastos_mensual_global',
    'costo_equipo_solucion',
    'costo_prueba_config',
    'consumible_prueba',
    'volumen_area_mensual'
  ];

  console.log("=== REGISTROS POR TABLA ===");
  for (const t of tables) {
    try {
      const res = await pool.request().query(`SELECT COUNT(*) as count FROM ${t}`);
      console.log(`${t}: ${res.recordset[0].count} filas`);
    } catch (e) {
      console.log(`${t}: ERROR (${e.message})`);
    }
  }
  process.exit(0);
}
checkTables();
