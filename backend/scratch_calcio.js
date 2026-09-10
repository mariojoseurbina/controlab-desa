const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { getPool } = require('./config/db');

async function check() {
  const pool = await getPool();
  const res = await pool.request().query("SELECT id, codigo, nombre, marca, presentacion, frascos_por_caja, volumen_por_frasco, pruebas_teoricas_frasco, pruebas_teoricas_caja, consumo_indicado, volumen_total_caja, stock_actual FROM items_inventario WHERE id IN (17513, 17536)");
  console.log('--- CALCIO ITEMS METADATA ---');
  console.table(res.recordset);
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
