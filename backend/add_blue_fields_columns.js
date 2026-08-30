const path = require('path');
const { getPool } = require(path.join(__dirname, 'config', 'database'));

async function runMigration() {
  try {
    console.log('🔄 Verificando y agregando columnas en azul a la tabla items_inventario...');
    const pool = await getPool();

    const columnsToAdd = [
      { name: 'codigo_barra', type: 'NVARCHAR(100) NULL' },
      { name: 'referencia', type: 'NVARCHAR(50) NULL' },
      { name: 'grupo', type: 'NVARCHAR(50) NULL' },
      { name: 'panel', type: 'NVARCHAR(100) NULL' },
      { name: 'control_asociado', type: 'NVARCHAR(100) NULL' },
      { name: 'calibradores_asociados', type: 'NVARCHAR(200) NULL' },
      { name: 'unidad_manejo', type: 'NVARCHAR(20) NULL' },
      { name: 'costo_unitario_manejo', type: 'DECIMAL(10, 4) NULL' },
      { name: 'aplica_iva', type: 'BIT DEFAULT 0 NULL' },
      { name: 'porcentaje_utilidad', type: 'DECIMAL(5, 2) NULL' },
      { name: 'stock_promedio', type: 'DECIMAL(10, 2) DEFAULT 0 NULL' },
      { name: 'unidad_negocio', type: 'NVARCHAR(100) NULL' },
      { name: 'equipo_asociado', type: 'NVARCHAR(100) NULL' },
      { name: 'consumo_indicado', type: 'DECIMAL(10, 4) NULL' },
      { name: 'consumo_real', type: 'DECIMAL(10, 4) NULL' },
      { name: 'desviacion_consumo', type: 'DECIMAL(5, 2) NULL' }
    ];

    const checkRes = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'items_inventario'
    `);
    
    const existingCols = checkRes.recordset.map(c => c.COLUMN_NAME.toLowerCase());
    console.log('📋 Columnas existentes en items_inventario:', existingCols.length);

    for (const col of columnsToAdd) {
      if (!existingCols.includes(col.name.toLowerCase())) {
        console.log(`➕ Agregando columna: ${col.name}...`);
        await pool.request().query(`ALTER TABLE items_inventario ADD ${col.name} ${col.type};`);
        console.log(`✅ Columna ${col.name} agregada exitosamente.`);
      } else {
        console.log(`ℹ️ Columna ${col.name} ya existe.`);
      }
    }

    console.log('🎉 Migración de base de datos completada con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  }
}

runMigration();
