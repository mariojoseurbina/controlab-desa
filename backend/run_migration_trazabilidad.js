const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Controlab100.',
  server: 'localhost',
  database: 'ControlabIA_Desa',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function runMigration() {
  try {
    await sql.connect(config);
    console.log('✅ Conectado a la base de datos SQL Server.');

    // 1. Create registro_trazabilidad table if it doesn't exist
    console.log('🔄 Ejecutando migración: Creando tabla registro_trazabilidad...');
    await sql.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='registro_trazabilidad' and xtype='U')
      BEGIN
          CREATE TABLE registro_trazabilidad (
              id INT IDENTITY(1,1) PRIMARY KEY,
              usuario_id INT NOT NULL,
              accion NVARCHAR(100) NOT NULL,
              entidad NVARCHAR(100) NOT NULL,
              entidad_id INT NULL,
              detalles_json NVARCHAR(MAX) NULL,
              direccion_ip NVARCHAR(50) NULL,
              fecha_registro DATETIME DEFAULT GETDATE() NOT NULL,
              CONSTRAINT FK_Trazabilidad_Usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
          );
          
          CREATE INDEX IX_Trazabilidad_Usuario ON registro_trazabilidad(usuario_id);
          CREATE INDEX IX_Trazabilidad_Entidad ON registro_trazabilidad(entidad, entidad_id);
          CREATE INDEX IX_Trazabilidad_Fecha ON registro_trazabilidad(fecha_registro);
          
          PRINT 'Tabla registro_trazabilidad creada con éxito.';
      END
      ELSE
      BEGIN
          PRINT 'La tabla registro_trazabilidad ya existe.';
      END
    `);
    
    console.log('✅ Migración completada exitosamente.');
  } catch (err) {
    console.error('❌ Error ejecutando migración:', err);
  } finally {
    sql.close();
  }
}

runMigration();
