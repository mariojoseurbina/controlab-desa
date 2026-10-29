const sql = require('mssql');
require('dotenv').config();
const { dbConfig } = require('./config/db');

async function check() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log('✅ Conexión BD exitosa');

    // Verificar tablas
    const tablas = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('solicitudes_pedidos','solicitudes_items','solicitudes_productos')
    `);
    console.log('📋 Tablas encontradas:', tablas.recordset.map(r => r.TABLE_NAME));

    // Verificar items_inventario
    const items = await pool.request().query('SELECT COUNT(*) as total FROM items_inventario WHERE activo = 1');
    console.log('📦 Items en inventario activos:', items.recordset[0].total);

    // Prueba de búsqueda
    const busq = await pool.request()
      .input('q', sql.NVarChar, '%a%')
      .query('SELECT TOP 3 id, nombre, codigo FROM items_inventario WHERE activo = 1 AND nombre LIKE @q');
    console.log('🔍 Muestra de productos:', busq.recordset);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
