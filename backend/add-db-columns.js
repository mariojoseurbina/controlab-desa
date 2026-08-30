const { getPool } = require('./config/database');

async function run() {
  try {
    const pool = await getPool();
    console.log('Altering LotesReactivos table to add FechaApertura and UsuarioApertura...');
    
    // Check if columns already exist
    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'LotesReactivos' 
        AND COLUMN_NAME IN ('FechaApertura', 'UsuarioApertura')
    `);
    
    const existing = checkColumns.recordset.map(c => c.COLUMN_NAME);
    console.log('Existing columns:', existing);
    
    if (!existing.includes('FechaApertura')) {
      await pool.request().query(`
        ALTER TABLE LotesReactivos ADD FechaApertura DATE NULL;
      `);
      console.log('Added FechaApertura column successfully.');
    }
    
    if (!existing.includes('UsuarioApertura')) {
      await pool.request().query(`
        ALTER TABLE LotesReactivos ADD UsuarioApertura VARCHAR(100) NULL;
      `);
      console.log('Added UsuarioApertura column successfully.');
    }
    
    console.log('Database script completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error altering table:', error.message);
    process.exit(1);
  }
}

run();
