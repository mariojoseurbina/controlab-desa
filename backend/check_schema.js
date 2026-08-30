require('dotenv').config();
const { getPool, sql } = require('./config/db.js');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LotesReactivos'");
  console.log(res.recordset);
  process.exit(0);
}
run();
