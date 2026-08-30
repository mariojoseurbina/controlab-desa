const prisma = require('./src/core/prisma');

async function migrateColumnsWithPrisma() {
  console.log('🔄 Agregando columnas faltantes a items_inventario usando Prisma $executeRawUnsafe...');

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

  for (const col of columnsToAdd) {
    try {
      await prisma.$executeRawUnsafe(`
        IF NOT EXISTS (
          SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'items_inventario' AND COLUMN_NAME = '${col.name}'
        )
        BEGIN
          ALTER TABLE items_inventario ADD ${col.name} ${col.type};
        END
      `);
      console.log(`✅ Columna ${col.name} verificada/agregada.`);
    } catch (err) {
      console.error(`⚠️ Error en columna ${col.name}:`, err.message);
    }
  }

  console.log('🎉 Migración de columnas finalizada.');
  process.exit(0);
}

migrateColumnsWithPrisma();
