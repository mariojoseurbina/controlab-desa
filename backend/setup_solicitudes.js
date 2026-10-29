// Crear tabla solicitudes_productos usando mssql directo (mismo patrón que las rutas existentes)
const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { dbConfig } = require('./config/db');

async function run() {
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Conectado a la BD');

    // 1. Crear tabla si no existe
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'solicitudes_productos')
      BEGIN
        CREATE TABLE solicitudes_productos (
          id                  INT IDENTITY(1,1) PRIMARY KEY,
          item_id             INT NOT NULL,
          nombre_item         NVARCHAR(200) NOT NULL,
          cantidad_solicitada DECIMAL(10,2) NOT NULL,
          unidad              NVARCHAR(50),
          fecha_solicitud     DATETIME DEFAULT GETDATE(),
          solicitante_id      INT,
          solicitante_nombre  NVARCHAR(150),
          area_solicitante    NVARCHAR(100),
          prioridad           NVARCHAR(20) DEFAULT 'Media',
          estado              NVARCHAR(30) DEFAULT 'Pendiente',
          observaciones       NVARCHAR(500),
          fecha_atencion      DATETIME NULL,
          atendido_por        NVARCHAR(150) NULL,
          created_at          DATETIME DEFAULT GETDATE(),
          updated_at          DATETIME DEFAULT GETDATE()
        );
        PRINT '✅ Tabla solicitudes_productos CREADA';
      END
      ELSE
        PRINT 'ℹ️ Tabla solicitudes_productos ya existe';
    `);
    console.log('✅ Tabla solicitudes_productos verificada/creada');

    // 2. Verificar si hay datos
    const countResult = await pool.request().query('SELECT COUNT(*) as cnt FROM solicitudes_productos');
    const count = countResult.recordset[0].cnt;
    
    if (count === 0) {
      // Tomar primeros 3 productos del inventario para crear solicitudes de ejemplo
      const items = await pool.request().query(`
        SELECT TOP 3 id, nombre, unidad, categoria FROM items_inventario WHERE activo = 1 ORDER BY nombre
      `);
      
      for (const item of items.recordset) {
        await pool.request()
          .input('item_id', sql.Int, item.id)
          .input('nombre_item', sql.NVarChar, item.nombre)
          .input('unidad', sql.NVarChar, item.unidad || 'UND')
          .query(`
            INSERT INTO solicitudes_productos 
              (item_id, nombre_item, cantidad_solicitada, unidad, solicitante_nombre, area_solicitante, prioridad, estado, observaciones)
            VALUES 
              (@item_id, @nombre_item, 5, @unidad, N'Juan Pérez', N'Laboratorio', N'Alta', N'Pendiente', N'Solicitud de prueba inicial')
          `);
      }
      console.log('✅ ' + items.recordset.length + ' solicitudes de prueba insertadas');
    } else {
      console.log('ℹ️ Ya hay ' + count + ' solicitudes en la BD');
    }

    console.log('✅ Setup completado exitosamente');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    if (pool) await pool.close();
    process.exit(0);
  }
}

run();
