const sql = require('mssql');

const dbConfig = {
  server: 'localhost',
  database: 'ControlabIA',
  user: 'controlab_user',
  password: 'Delicia1.',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function checkTables() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log('Connected!');
    
    const result = await pool.request().query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME IN ('mapeo_pruebas_reactivos', 'LotesReactivos')
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);
    
    console.log('Columns:');
    result.recordset.forEach(c => console.log(` - ${c.TABLE_NAME}.${c.COLUMN_NAME} (${c.DATA_TYPE})`));
    
    await pool.close();
  } catch (e) {
    console.error(e);
  }
}

checkTables();
