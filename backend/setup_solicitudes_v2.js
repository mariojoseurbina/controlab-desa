// Migración: Solicitudes por lote
// Crea las tablas solicitudes_pedidos + solicitudes_items
const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { dbConfig } = require('./config/db');

async function run() {
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Conectado a la BD');

    // 1. Tabla maestra de pedidos
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'solicitudes_pedidos')
      BEGIN
        CREATE TABLE solicitudes_pedidos (
          id                  INT IDENTITY(1,1) PRIMARY KEY,
          numero_pedido       NVARCHAR(30) NOT NULL,
          solicitante_nombre  NVARCHAR(150),
          area_solicitante    NVARCHAR(100),
          prioridad           NVARCHAR(20) DEFAULT 'Media',
          estado              NVARCHAR(30) DEFAULT 'Pendiente',
          observaciones       NVARCHAR(500),
          fecha_solicitud     DATETIME DEFAULT GETDATE(),
          fecha_atencion      DATETIME NULL,
          atendido_por        NVARCHAR(150) NULL,
          notas_almacen       NVARCHAR(500) NULL,
          created_at          DATETIME DEFAULT GETDATE(),
          updated_at          DATETIME DEFAULT GETDATE()
        );
        PRINT '✅ Tabla solicitudes_pedidos CREADA';
      END
      ELSE
        PRINT 'ℹ️ Tabla solicitudes_pedidos ya existe';
    `);

    // 2. Tabla de ítems del pedido
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'solicitudes_items')
      BEGIN
        CREATE TABLE solicitudes_items (
          id                  INT IDENTITY(1,1) PRIMARY KEY,
          pedido_id           INT NOT NULL REFERENCES solicitudes_pedidos(id) ON DELETE CASCADE,
          item_id             INT NOT NULL,
          nombre_item         NVARCHAR(200) NOT NULL,
          codigo_item         NVARCHAR(50),
          cantidad_solicitada DECIMAL(10,2) NOT NULL,
          cantidad_entregada  DECIMAL(10,2) NULL,
          unidad              NVARCHAR(50),
          observacion_item    NVARCHAR(300),
          estado_item         NVARCHAR(30) DEFAULT 'Pendiente',
          created_at          DATETIME DEFAULT GETDATE()
        );
        PRINT '✅ Tabla solicitudes_items CREADA';
      END
      ELSE
        PRINT 'ℹ️ Tabla solicitudes_items ya existe';
    `);

    // 3. Verificar si hay datos
    const countResult = await pool.request().query('SELECT COUNT(*) as cnt FROM solicitudes_pedidos');
    const count = countResult.recordset[0].cnt;

    if (count === 0) {
      // Tomar 2 productos para demo
      const items = await pool.request().query(`
        SELECT TOP 4 id, nombre, unidad, codigo FROM items_inventario WHERE activo = 1 ORDER BY nombre
      `);

      if (items.recordset.length > 0) {
        // Pedido 1: Alta prioridad, Pendiente
        const p1 = await pool.request()
          .input('numero', sql.NVarChar, 'PED-2026-001')
          .input('solicitante', sql.NVarChar, 'María González')
          .input('area', sql.NVarChar, 'Laboratorio')
          .input('prioridad', sql.NVarChar, 'Alta')
          .input('estado', sql.NVarChar, 'Pendiente')
          .input('obs', sql.NVarChar, 'Urgente para análisis del día')
          .query(`
            INSERT INTO solicitudes_pedidos (numero_pedido, solicitante_nombre, area_solicitante, prioridad, estado, observaciones)
            OUTPUT INSERTED.id
            VALUES (@numero, @solicitante, @area, @prioridad, @estado, @obs)
          `);
        const pid1 = p1.recordset[0].id;

        // Agregar ítems al pedido 1
        for (let i = 0; i < Math.min(2, items.recordset.length); i++) {
          const it = items.recordset[i];
          await pool.request()
            .input('pid', sql.Int, pid1)
            .input('iid', sql.Int, it.id)
            .input('nombre', sql.NVarChar, it.nombre)
            .input('codigo', sql.NVarChar, it.codigo || '')
            .input('cant', sql.Decimal(10, 2), 5)
            .input('unidad', sql.NVarChar, it.unidad || 'UND')
            .query(`
              INSERT INTO solicitudes_items (pedido_id, item_id, nombre_item, codigo_item, cantidad_solicitada, unidad)
              VALUES (@pid, @iid, @nombre, @codigo, @cant, @unidad)
            `);
        }

        // Pedido 2: Media prioridad, Entregada
        if (items.recordset.length >= 3) {
          const p2 = await pool.request()
            .input('numero', sql.NVarChar, 'PED-2026-002')
            .input('solicitante', sql.NVarChar, 'Carlos Rodríguez')
            .input('area', sql.NVarChar, 'Hematología')
            .input('prioridad', sql.NVarChar, 'Media')
            .input('estado', sql.NVarChar, 'Entregada')
            .input('obs', sql.NVarChar, 'Reposición mensual')
            .query(`
              INSERT INTO solicitudes_pedidos (numero_pedido, solicitante_nombre, area_solicitante, prioridad, estado, observaciones, fecha_atencion, atendido_por)
              OUTPUT INSERTED.id
              VALUES (@numero, @solicitante, @area, @prioridad, @estado, @obs, GETDATE(), 'Almacén Central')
            `);
          const pid2 = p2.recordset[0].id;

          for (let i = 2; i < Math.min(4, items.recordset.length); i++) {
            const it = items.recordset[i];
            await pool.request()
              .input('pid', sql.Int, pid2)
              .input('iid', sql.Int, it.id)
              .input('nombre', sql.NVarChar, it.nombre)
              .input('codigo', sql.NVarChar, it.codigo || '')
              .input('cant', sql.Decimal(10, 2), 3)
              .input('entregada', sql.Decimal(10, 2), 3)
              .input('unidad', sql.NVarChar, it.unidad || 'UND')
              .query(`
                INSERT INTO solicitudes_items (pedido_id, item_id, nombre_item, codigo_item, cantidad_solicitada, cantidad_entregada, unidad, estado_item)
                VALUES (@pid, @iid, @nombre, @codigo, @cant, @entregada, @unidad, 'Entregado')
              `);
          }
        }
        console.log('✅ Datos de demostración insertados');
      }
    } else {
      console.log(`ℹ️ Ya hay ${count} pedidos en la BD`);
    }

    console.log('✅ Migración completada exitosamente');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    if (pool) await pool.close();
    process.exit(0);
  }
}

run();
