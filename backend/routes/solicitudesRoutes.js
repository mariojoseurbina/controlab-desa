const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');

// ─── Auto-creación de tablas (una sola vez por arranque) ──
let tablasListas = false;
async function ensureTables(pool) {
  if (tablasListas) return;
  await pool.request().query(`
    IF OBJECT_ID('dbo.solicitudes_pedidos', 'U') IS NULL
    CREATE TABLE dbo.solicitudes_pedidos (
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
    IF OBJECT_ID('dbo.solicitudes_items', 'U') IS NULL
    CREATE TABLE dbo.solicitudes_items (
      id                  INT IDENTITY(1,1) PRIMARY KEY,
      pedido_id           INT NOT NULL REFERENCES dbo.solicitudes_pedidos(id) ON DELETE CASCADE,
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
  `);
  tablasListas = true;
}

async function db() {
  const pool = await getPool();
  await ensureTables(pool);
  return pool;
}

// ─── Helper: número de pedido ─────────────────────────────
async function generarNumeroPedido(request) {
  const yyyy = new Date().getFullYear();
  const result = await request.query(`
    SELECT ISNULL(MAX(TRY_CAST(SUBSTRING(numero_pedido, 10, 20) AS INT)), 0) AS ultimo
    FROM solicitudes_pedidos WITH (UPDLOCK, HOLDLOCK)
    WHERE numero_pedido LIKE 'PED-${yyyy}-%'
  `);
  const seq = String(result.recordset[0].ultimo + 1).padStart(3, '0');
  return `PED-${yyyy}-${seq}`;
}

// ─────────────────────────────────────────────────────────
// GET /api/solicitudes/stats — Estadísticas
// IMPORTANTE: debe ir ANTES de /:id
// ─────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const pool = await db();
    const result = await pool.request().query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'Pendiente'    THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'Aprobada'     THEN 1 ELSE 0 END) as aprobadas,
        SUM(CASE WHEN estado = 'En Despacho'  THEN 1 ELSE 0 END) as en_despacho,
        SUM(CASE WHEN estado = 'Entregada'    THEN 1 ELSE 0 END) as entregadas,
        SUM(CASE WHEN estado = 'Rechazada'    THEN 1 ELSE 0 END) as rechazadas
      FROM solicitudes_pedidos
    `);
    res.json({ success: true, stats: result.recordset[0] });
  } catch (error) {
    console.error('Error stats solicitudes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/solicitudes/productos/buscar?q=texto
// IMPORTANTE: debe ir ANTES de /:id
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// GET /api/solicitudes/catalogo-almacen-central — Productos en Almacén Central
// ─────────────────────────────────────────────────────────
router.get('/catalogo-almacen-central', async (req, res) => {
  try {
    const { q, categoria } = req.query;
    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT TOP 100
        i.id, i.codigo, i.nombre, i.descripcion, i.categoria, i.unidad, i.marca, i.area_operativa, i.equipo_asociado,
        ISNULL(sa.stock_actual, 0) as stock_central,
        i.stock_actual as stock_global
      FROM items_inventario i
      LEFT JOIN stock_por_almacen sa ON sa.item_id = i.id AND sa.almacen_id = 1
      WHERE ISNULL(i.activo, 1) = 1
    `;

    if (q && q.trim().length > 0) {
      request.input('busqueda', sql.NVarChar, `%${q.trim()}%`);
      query += ` AND (i.nombre LIKE @busqueda OR i.codigo LIKE @busqueda OR i.descripcion LIKE @busqueda OR i.marca LIKE @busqueda)`;
    }

    if (categoria && categoria !== 'Todas') {
      request.input('categoria', sql.NVarChar, categoria);
      query += ` AND i.categoria = @categoria`;
    }

    query += ` ORDER BY CASE WHEN ISNULL(sa.stock_actual, 0) > 0 THEN 0 ELSE 1 END, i.nombre ASC`;

    const result = await request.query(query);
    res.json({ success: true, productos: result.recordset });
  } catch (error) {
    console.error('Error catalogo almacen central:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/productos/buscar', async (req, res) => {
  try {
    const { q } = req.query;
    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT TOP 30
        i.id, i.codigo, i.nombre, i.descripcion, i.categoria, i.unidad, i.marca, i.area_operativa, i.equipo_asociado,
        ISNULL(sa.stock_actual, 0) as stock_central,
        ISNULL(sa.stock_actual, i.stock_actual) as stock_actual
      FROM items_inventario i
      LEFT JOIN stock_por_almacen sa ON sa.item_id = i.id AND sa.almacen_id = 1
      WHERE ISNULL(i.activo, 1) = 1
    `;

    if (q && q.trim().length >= 1) {
      request.input('busqueda', sql.NVarChar, `%${q.trim()}%`);
      query += ` AND (i.nombre LIKE @busqueda OR i.codigo LIKE @busqueda OR i.descripcion LIKE @busqueda OR i.marca LIKE @busqueda)`;
    }

    query += ` ORDER BY CASE WHEN ISNULL(sa.stock_actual, 0) > 0 THEN 0 ELSE 1 END, i.nombre ASC`;

    const result = await request.query(query);
    res.json({ success: true, productos: result.recordset });
  } catch (error) {
    console.error('Error buscando productos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/solicitudes — Listar pedidos con resumen de ítems
// ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const pool = await db();
    const pedidos = await pool.request().query(`
      SELECT 
        p.id, p.numero_pedido, p.solicitante_nombre, p.area_solicitante,
        p.prioridad, p.estado, p.observaciones, p.fecha_solicitud,
        p.fecha_atencion, p.atendido_por, p.notas_almacen,
        p.created_at, p.updated_at,
        COUNT(si.id) as total_items
      FROM solicitudes_pedidos p
      LEFT JOIN solicitudes_items si ON si.pedido_id = p.id
      GROUP BY 
        p.id, p.numero_pedido, p.solicitante_nombre, p.area_solicitante,
        p.prioridad, p.estado, p.observaciones, p.fecha_solicitud,
        p.fecha_atencion, p.atendido_por, p.notas_almacen,
        p.created_at, p.updated_at
      ORDER BY p.fecha_solicitud DESC
    `);
    res.json({ success: true, solicitudes: pedidos.recordset });
  } catch (error) {
    console.error('Error obteniendo solicitudes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/solicitudes/:id — Detalle de un pedido + ítems
// ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const pool = await db();

    const pedidoRes = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM solicitudes_pedidos WHERE id = @id');

    if (pedidoRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    const itemsRes = await pool.request()
      .input('pid', sql.Int, req.params.id)
      .query(`
        SELECT 
          si.*,
          i.stock_actual, i.categoria
        FROM solicitudes_items si
        LEFT JOIN items_inventario i ON i.id = si.item_id
        WHERE si.pedido_id = @pid
        ORDER BY si.id
      `);

    res.json({
      success: true,
      pedido: pedidoRes.recordset[0],
      items: itemsRes.recordset
    });
  } catch (error) {
    console.error('Error detalle pedido:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/solicitudes — Crear pedido con múltiples ítems
// ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  let transaction;
  try {
    const {
      solicitante_nombre,
      area_solicitante,
      prioridad,
      observaciones,
      items
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'El pedido debe tener al menos un ítem' });
    }
    for (const it of items) {
      if (!Number.isInteger(Number(it.item_id)) || !(Number(it.cantidad_solicitada) > 0)) {
        return res.status(400).json({ success: false, message: `Ítem inválido: ${it.nombre_item || it.item_id}` });
      }
    }

    const pool = await db();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const numeroPedido = await generarNumeroPedido(new sql.Request(transaction));

    const pedidoRes = await new sql.Request(transaction)
      .input('numero_pedido',     sql.NVarChar(30),  numeroPedido)
      .input('solicitante_nombre',sql.NVarChar(150), solicitante_nombre || 'Sin asignar')
      .input('area_solicitante',  sql.NVarChar(100), area_solicitante || '')
      .input('prioridad',         sql.NVarChar(20),  prioridad || 'Media')
      .input('observaciones',     sql.NVarChar(500), observaciones || '')
      .query(`
        INSERT INTO solicitudes_pedidos 
          (numero_pedido, solicitante_nombre, area_solicitante, prioridad, estado, observaciones)
        VALUES 
          (@numero_pedido, @solicitante_nombre, @area_solicitante, @prioridad, 'Pendiente', @observaciones);
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
      `);

    const pedidoId = pedidoRes.recordset[0].id;

    for (const item of items) {
      await new sql.Request(transaction)
        .input('pedido_id',           sql.Int,           pedidoId)
        .input('item_id',             sql.Int,           Number(item.item_id))
        .input('nombre_item',         sql.NVarChar(200), String(item.nombre_item || '').substring(0, 200))
        .input('codigo_item',         sql.NVarChar(50),  String(item.codigo_item || '').substring(0, 50))
        .input('cantidad_solicitada', sql.Decimal(10,2), Number(item.cantidad_solicitada))
        .input('unidad',              sql.NVarChar(50),  String(item.unidad || 'UND').substring(0, 50))
        .input('observacion_item',    sql.NVarChar(300), String(item.observacion_item || '').substring(0, 300))
        .query(`
          INSERT INTO solicitudes_items 
            (pedido_id, item_id, nombre_item, codigo_item, cantidad_solicitada, unidad, observacion_item)
          VALUES 
            (@pedido_id, @item_id, @nombre_item, @codigo_item, @cantidad_solicitada, @unidad, @observacion_item)
        `);
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      pedido: { id: pedidoId, numero_pedido: numeroPedido, total_items: items.length },
      numero_pedido: numeroPedido
    });
  } catch (error) {
    if (transaction) { try { await transaction.rollback(); } catch (_) {} }
    console.error('Error creando pedido:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/solicitudes/:id/estado — Cambiar estado
// ─────────────────────────────────────────────────────────
router.patch('/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, atendido_por, notas_almacen } = req.body;

    const estadosValidos = ['Pendiente', 'Aprobada', 'En Despacho', 'Entregada', 'Rechazada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado no válido' });
    }

    const pool = await db();
    const result = await pool.request()
      .input('id',           sql.Int,      id)
      .input('estado',       sql.NVarChar, estado)
      .input('atendido_por', sql.NVarChar, atendido_por || null)
      .input('notas_almacen',sql.NVarChar, notas_almacen || null)
      .query(`
        UPDATE solicitudes_pedidos 
        SET estado        = @estado, 
            atendido_por  = @atendido_por,
            notas_almacen = @notas_almacen,
            fecha_atencion = CASE WHEN @estado <> 'Pendiente' THEN GETDATE() ELSE fecha_atencion END,
            updated_at    = GETDATE()
        WHERE id = @id;
        SELECT * FROM solicitudes_pedidos WHERE id = @id;
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    if (estado === 'Entregada') {
      await pool.request()
        .input('pid', sql.Int, id)
        .query(`UPDATE solicitudes_items SET estado_item = 'Entregado' WHERE pedido_id = @pid AND estado_item = 'Pendiente'`);
    }

    res.json({ success: true, solicitud: result.recordset[0] });
  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/solicitudes/:id — Eliminar pedido
// ─────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await db();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM solicitudes_pedidos WHERE id = @id');
    res.json({ success: true, message: 'Pedido eliminado' });
  } catch (error) {
    console.error('Error eliminando pedido:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
