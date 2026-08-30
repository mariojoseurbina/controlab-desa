const { sql, getPool } = require('./config/database');

async function testDB() {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM registro_trazabilidad');
    console.log('Filas en trazabilidad:', result.recordset.length);
    if (result.recordset.length > 0) {
        console.log(result.recordset);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

testDB();
