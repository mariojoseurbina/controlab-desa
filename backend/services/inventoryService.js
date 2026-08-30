const sql = require('mssql');
const auditService = require('./auditService');

const { dbConfig } = require('../config/db');

class InventoryService {
  async getAllItems() {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .query('SELECT * FROM items_inventario WHERE activo = 1 ORDER BY fecha_actualizacion DESC');
    return result.recordset;
  }

  async getItemById(id) {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM items_inventario WHERE id = @id AND activo = 1');
    return result.recordset[0];
  }

  async createItem(data, userId) {
    const pool = await sql.connect(dbConfig);

    // Verificar si el código ya existe
    const existing = await pool.request()
      .input('codigo', sql.VarChar, data.codigo)
      .query('SELECT id FROM items_inventario WHERE codigo = @codigo');

    if (existing.recordset.length > 0) {
      throw new Error('El código ya existe');
    }

    const fechaVenc = data.fecha_vencimiento && data.fecha_vencimiento.trim() !== ''
      ? data.fecha_vencimiento : null;

    await pool.request()
      .input('codigo',           sql.VarChar(50),   data.codigo)
      .input('nombre',           sql.VarChar(200),  data.nombre)
      .input('descripcion',      sql.VarChar(500),  data.descripcion || null)
      .input('categoria',        sql.VarChar(50),   data.categoria)
      .input('unidad',           sql.VarChar(50),   data.unidad)
      .input('marca',            sql.VarChar(100),  data.marca || null)
      .input('stock_actual',     sql.Int,            parseInt(data.stock_actual) || 0)
      .input('stock_minimo',     sql.Int,            parseInt(data.stock_minimo) || 0)
      .input('stock_critico',    sql.Int,            parseInt(data.stock_critico) || 0)
      .input('proveedor',        sql.VarChar(200),  data.proveedor || null)
      .input('precio_costo',     sql.Decimal(10,2), parseFloat(data.precio_costo) || 0)
      .input('precio_venta',     sql.Decimal(10,2), parseFloat(data.precio_venta) || 0)
      .input('ubicacion',        sql.VarChar(200),  data.ubicacion || null)
      .input('fecha_vencimiento',sql.Date,           fechaVenc)
      .input('creado_por',       sql.Int,            userId || 1)
      .query(`
        INSERT INTO items_inventario (
          codigo, nombre, descripcion, categoria, unidad, marca, stock_actual,
          stock_minimo, stock_critico, proveedor, precio_costo, precio_venta,
          ubicacion, fecha_vencimiento, creado_por, fecha_creacion, fecha_actualizacion
        ) VALUES (
          @codigo, @nombre, @descripcion, @categoria, @unidad, @marca, @stock_actual,
          @stock_minimo, @stock_critico, @proveedor, @precio_costo, @precio_venta,
          @ubicacion, @fecha_vencimiento, @creado_por, GETDATE(), GETDATE()
        )
        SELECT SCOPE_IDENTITY() AS Id;
      `);
      
    const insertedId = result.recordset[0].Id;
    await auditService.logEvent(
      userId || 1,
      'CREAR',
      'ITEM_INVENTARIO',
      insertedId,
      { codigo: data.codigo, nombre: data.nombre }
    );
    return { message: 'Item creado exitosamente', id: insertedId };
  }

  async updateItem(id, data, userId) {
    const pool = await sql.connect(dbConfig);

    const fechaVenc = data.fecha_vencimiento && data.fecha_vencimiento.trim() !== ''
      ? data.fecha_vencimiento : null;

    await pool.request()
      .input('id',               sql.Int,            id)
      .input('codigo',           sql.VarChar(50),   data.codigo)
      .input('nombre',           sql.VarChar(200),  data.nombre)
      .input('descripcion',      sql.VarChar(500),  data.descripcion || null)
      .input('categoria',        sql.VarChar(50),   data.categoria)
      .input('unidad',           sql.VarChar(50),   data.unidad)
      .input('marca',            sql.VarChar(100),  data.marca || null)
      .input('stock_minimo',     sql.Int,            parseInt(data.stock_minimo) || 0)
      .input('stock_critico',    sql.Int,            parseInt(data.stock_critico) || 0)
      .input('proveedor',        sql.VarChar(200),  data.proveedor || null)
      .input('precio_costo',     sql.Decimal(10,2), parseFloat(data.precio_costo) || 0)
      .input('precio_venta',     sql.Decimal(10,2), parseFloat(data.precio_venta) || 0)
      .input('ubicacion',        sql.VarChar(200),  data.ubicacion || null)
      .input('fecha_vencimiento',sql.Date,           fechaVenc)
      .query(`
        UPDATE items_inventario SET
          codigo = @codigo, nombre = @nombre, descripcion = @descripcion,
          categoria = @categoria, unidad = @unidad, marca = @marca,
          stock_minimo = @stock_minimo, stock_critico = @stock_critico,
          proveedor = @proveedor, precio_costo = @precio_costo,
          precio_venta = @precio_venta, ubicacion = @ubicacion,
          fecha_vencimiento = @fecha_vencimiento,
          fecha_actualizacion = GETDATE()
        WHERE id = @id AND activo = 1
      `);
      
    await auditService.logEvent(
      userId || 1,
      'EDITAR',
      'ITEM_INVENTARIO',
      id,
      data
    );
    return { message: 'Item actualizado exitosamente' };
  }

  async deleteItem(id, userId) {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input('id', sql.Int, id)
      .query('UPDATE items_inventario SET activo = 0, fecha_actualizacion = GETDATE() WHERE id = @id');
      
    await auditService.logEvent(
      userId || 1,
      'ELIMINAR',
      'ITEM_INVENTARIO',
      id,
      { accion: 'Desactivado lógicamente' }
    );
    return { message: 'Item eliminado exitosamente' };
  }
}

module.exports = new InventoryService();
