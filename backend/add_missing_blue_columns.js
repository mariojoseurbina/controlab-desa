const { executeQuery } = require('./config/db');

async function migrateBlueColumns() {
  console.log('ðŸ”„ Verificando y agregando columnas faltantes en items_inventario (ControlabIA_Desa)...');

  const columnsToAdd = [
    { name: 'codigo_barra', type: 'NVARCHAR(100) NULL' },
    { name: 'referencia', type: 'NVARCHAR(50) NULL' },
    { name: 'grupo', type: 'NVARCHAR(50) NULL' },
    { name: 'panel', type: 'NVARCHAR(100) NULL' },
    { name: 'control_asociado', type: 'NVARCHAR(100) NULL' },
    { name: 'calibradores_asociados', type: 'NVARCHAR(200) NULL' },
    { name: 'unidad_manejo', type: 'NVARCHAR(20) NULL' },
    { name: 'cantidad_unidades', type: 'DECIMAL(10, 2) DEFAULT 1 NULL' },
    { name: 'costo_unitario_manejo', type: 'DECIMAL(10, 4) NULL' },
    { name: 'aplica_iva', type: 'BIT DEFAULT 0 NULL' },
    { name: 'porcentaje_utilidad', type: 'DECIMAL(5, 2) NULL' },
    { name: 'stock_promedio', type: 'DECIMAL(10, 2) DEFAULT 0 NULL' },
    { name: 'stock_maximo', type: 'DECIMAL(10, 2) DEFAULT 0 NULL' },
    { name: 'unidad_negocio', type: 'NVARCHAR(100) NULL' },
    { name: 'equipo_asociado', type: 'NVARCHAR(100) NULL' },
    { name: 'consumo_indicado', type: 'DECIMAL(10, 4) NULL' },
    { name: 'consumo_real', type: 'DECIMAL(10, 4) NULL' },
    { name: 'desviacion_consumo', type: 'DECIMAL(5, 2) NULL' }
  ];

  try {
    const existingColsRes = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'items_inventario'
    `);

    const existingCols = existingColsRes.map(c => c.COLUMN_NAME.toLowerCase());
    console.log(`ðŸ“‹ Columnas actuales en items_inventario: ${existingCols.length}`);

    for (const col of columnsToAdd) {
      if (!existingCols.includes(col.name.toLowerCase())) {
        console.log(`âž• Agregando columna faltante: ${col.name}...`);
        await executeQuery(`ALTER TABLE items_inventario ADD ${col.name} ${col.type};`);
        console.log(`âœ… Columna ${col.name} agregada exitosamente.`);
      } else {
        console.log(`â„¹ï¸ Columna ${col.name} ya estÃ¡ en la tabla.`);
      }
    }

    console.log('ðŸŽ‰ MigraciÃ³n completada con Ã©xito en SQL Server!');
    process.exit(0);
  } catch (err) {
    console.error('âŒ Error migrando columnas:', err.message);
    process.exit(1);
  }
}

migrateBlueColumns();

