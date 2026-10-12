const { sql, getPool } = require('./config/db.js');
const fs = require('fs');
require('dotenv').config();

async function run() {
  try {
    const pool = await getPool();
    const sqlScript = fs.readFileSync('C:\\controlab-desa\\scripts\\querys sql\\update_schema_recepcion_cajas.sql', 'utf8');
    
    // El driver mssql no procesa bien todo el script si tiene multiples comandos complejos.
    // Lo mejor es dividir por GO, pero como no tiene GO explícitos y son varios statements,
    // usaremos batch o múltiples request.
    const statements = sqlScript.split('--').filter(s => s.trim().length > 0 && !s.includes('Script de') && !s.includes('Proyecto:'));
    
    // Mejor ejecutemos el script completo usando Execute
    const request = pool.request();
    await request.batch(sqlScript);
    console.log('Migración completada exitosamente.');
  } catch (err) {
    console.error('Error aplicando migración:', err);
  } finally {
    process.exit(0);
  }
}
run();
