const { getPool } = require('./config/database');

async function run() {
  try {
    const pool = await getPool();
    console.log('=== Iniciando Actualización del Esquema e Inventario (Controlab IA) ===');

    // 1. Columnas a asegurar en items_inventario
    const columnsToEnsure = [
      { name: 'referencia_abreviada', type: 'NVARCHAR(50) NULL' },
      { name: 'nivel', type: 'NVARCHAR(50) NULL' },
      { name: 'frascos_por_caja', type: 'DECIMAL(10, 2) NULL' },
      { name: 'volumen_por_frasco', type: 'DECIMAL(10, 4) NULL' },
      { name: 'volumen_muerto_residual', type: 'DECIMAL(10, 4) NULL' },
      { name: 'pruebas_teoricas_frasco', type: 'DECIMAL(10, 2) NULL' }
    ];

    const checkRes = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'items_inventario'
    `);
    
    const existingCols = checkRes.recordset.map(c => c.COLUMN_NAME.toLowerCase());
    console.log('Columnas existentes en items_inventario:', existingCols.length);

    for (const col of columnsToEnsure) {
      if (!existingCols.includes(col.name.toLowerCase())) {
        console.log(`Agregando columna [${col.name}]...`);
        await pool.request().query(`
          ALTER TABLE items_inventario ADD ${col.name} ${col.type};
        `);
        console.log(`Columna [${col.name}] agregada exitosamente.`);
      } else {
        console.log(`La columna [${col.name}] ya existe.`);
      }
    }

    // 2. Vaciado/Reset de data autorizada para pruebas limpias
    console.log('\n--- Vaciando tablas relacionales de inventario para pruebas limpias ---');
    
    await pool.request().query(`
      BEGIN TRANSACTION;
      BEGIN TRY
        DELETE FROM vinculo_prueba_item;
        DELETE FROM LotesReactivos;
        DELETE FROM movimientos_inventario;
        DELETE FROM stock_por_almacen;
        DELETE FROM reactivos;
        DELETE FROM consumible_prueba;
        DELETE FROM items_inventario;
        COMMIT TRANSACTION;
        PRINT 'Tablas vaciadas con éxito.';
      END TRY
      BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
      END CATCH
    `);

    console.log('✅ Base de datos de inventario actualizada y vaciada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en script de actualización:', error.message);
    process.exit(1);
  }
}

run();
