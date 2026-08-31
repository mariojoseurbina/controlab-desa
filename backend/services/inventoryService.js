const sql = require('mssql');
const auditService = require('./auditService');

const { dbConfig } = require('../config/db');

const safeNum = (val, defaultVal = null) => {
  if (val === null || val === undefined || val === '') return defaultVal;
  const sanitized = String(val).replace(',', '.').trim();
  const num = Number(sanitized);
  return isNaN(num) ? defaultVal : num;
};

class InventoryService {
  async ensureSchema(pool) {
    try {
      const columnsToEnsure = [
        { name: 'codigo_barra', type: 'NVARCHAR(100) NULL' },
        { name: 'referencia', type: 'NVARCHAR(50) NULL' },
        { name: 'referencia_abreviada', type: 'NVARCHAR(50) NULL' },
        { name: 'presentacion', type: 'NVARCHAR(100) NULL' },
        { name: 'grupo', type: 'NVARCHAR(50) NULL' },
        { name: 'panel', type: 'NVARCHAR(100) NULL' },
        { name: 'control_asociado', type: 'NVARCHAR(100) NULL' },
        { name: 'calibradores_asociados', type: 'NVARCHAR(200) NULL' },
        { name: 'unidad_negocio', type: 'NVARCHAR(100) NULL' },
        { name: 'equipo_asociado', type: 'NVARCHAR(100) NULL' },
        { name: 'nivel', type: 'NVARCHAR(50) NULL' },
        { name: 'frascos_por_caja', type: 'DECIMAL(10, 2) NULL' },
        { name: 'volumen_por_frasco', type: 'DECIMAL(10, 4) NULL' },
        { name: 'volumen_muerto_residual', type: 'DECIMAL(10, 4) NULL' },
        { name: 'pruebas_teoricas_frasco', type: 'DECIMAL(10, 2) NULL' },
        { name: 'pruebas_teoricas_caja', type: 'DECIMAL(10, 2) NULL' },
        { name: 'volumen_total_caja', type: 'DECIMAL(10, 2) NULL' },
        { name: 'consumo_indicado', type: 'DECIMAL(10, 4) NULL' },
        { name: 'desviacion_consumo', type: 'DECIMAL(5, 2) NULL' }
      ];

      const checkRes = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'items_inventario'
      `);
      
      const existing = checkRes.recordset.map(c => c.COLUMN_NAME.toLowerCase());
      for (const col of columnsToEnsure) {
        if (!existing.includes(col.name.toLowerCase())) {
          await pool.request().query(`ALTER TABLE items_inventario ADD ${col.name} ${col.type}`);
        }
      }
    } catch (e) {
      console.warn("Advertencia en auto-migración de esquema:", e.message);
    }
  }

  async getAllItems() {
    const pool = await sql.connect(dbConfig);
    await this.ensureSchema(pool);
    const result = await pool.request()
      .query('SELECT * FROM items_inventario WHERE activo = 1 ORDER BY fecha_actualizacion DESC');
    return result.recordset;
  }

  async getItemById(id) {
    const pool = await sql.connect(dbConfig);
    await this.ensureSchema(pool);
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .query('SELECT * FROM items_inventario WHERE id = @id AND activo = 1');
    return result.recordset[0];
  }

  async createItem(data, userId) {
    const pool = await sql.connect(dbConfig);
    await this.ensureSchema(pool);

    const existing = await pool.request()
      .input('codigo', sql.VarChar(50), String(data.codigo || ''))
      .query('SELECT id FROM items_inventario WHERE codigo = @codigo');

    if (existing.recordset.length > 0) {
      throw new Error('El código ya existe');
    }

    const res = await pool.request()
      .input('codigo',                  sql.NVarChar(50),  String(data.codigo || ''))
      .input('codigo_barra',            sql.NVarChar(100), data.codigo_barra ? String(data.codigo_barra) : null)
      .input('referencia',              sql.NVarChar(50),  data.referencia ? String(data.referencia) : null)
      .input('referencia_abreviada',    sql.NVarChar(50),  data.referencia_abreviada ? String(data.referencia_abreviada) : null)
      .input('presentacion',            sql.NVarChar(100), data.presentacion ? String(data.presentacion) : null)
      .input('nombre',                  sql.NVarChar(100), String(data.nombre || ''))
      .input('descripcion',             sql.NVarChar(500), data.descripcion ? String(data.descripcion) : null)
      .input('marca',                   sql.NVarChar(100), data.marca ? String(data.marca) : null)
      .input('categoria',               sql.NVarChar(50),  String(data.categoria || 'Reactivo'))
      .input('unidad_negocio',          sql.NVarChar(100), data.unidad_negocio ? String(data.unidad_negocio) : null)
      .input('equipo_asociado',         sql.NVarChar(100), data.equipo_asociado ? String(data.equipo_asociado) : null)
      .input('grupo',                   sql.NVarChar(50),  data.grupo ? String(data.grupo) : null)
      .input('calibradores_asociados',  sql.NVarChar(200), data.calibradores_asociados ? String(data.calibradores_asociados) : null)
      .input('control_asociado',        sql.NVarChar(100), data.control_asociado ? String(data.control_asociado) : null)
      .input('ubicacion',               sql.NVarChar(50),  data.ubicacion ? String(data.ubicacion) : null)
      .input('nivel',                   sql.NVarChar(50),  data.nivel ? String(data.nivel) : null)
      .input('unidad',                  sql.NVarChar(20),  String(data.unidad || 'Frasco'))
      .input('frascos_por_caja',        sql.Decimal(10,2), safeNum(data.frascos_por_caja, 1))
      .input('volumen_por_frasco',      sql.Decimal(10,4), safeNum(data.volumen_por_frasco, null))
      .input('volumen_muerto_residual', sql.Decimal(10,4), safeNum(data.volumen_muerto_residual, null))
      .input('pruebas_teoricas_frasco', sql.Decimal(10,2), safeNum(data.pruebas_teoricas_frasco, null))
      .input('pruebas_teoricas_caja',   sql.Decimal(10,2), safeNum(data.pruebas_teoricas_caja, null))
      .input('volumen_total_caja',      sql.Decimal(10,2), safeNum(data.volumen_total_caja, null))
      .input('consumo_indicado',        sql.Decimal(10,4), safeNum(data.consumo_indicado, null))
      .input('stock_minimo',            sql.Decimal(10,2), safeNum(data.stock_minimo, 0))
      .input('stock_critico',           sql.Decimal(10,2), safeNum(data.stock_critico, 0))
      .input('precio_costo',            sql.Decimal(10,2), safeNum(data.precio_costo, 0))
      .input('creado_por',              sql.Int,           parseInt(userId, 10) || 1)
      .query(`
        INSERT INTO items_inventario (
          codigo, codigo_barra, referencia, referencia_abreviada, presentacion, nombre, descripcion,
          marca, categoria, unidad_negocio, equipo_asociado, grupo, calibradores_asociados,
          control_asociado, ubicacion, nivel, unidad, frascos_por_caja, volumen_por_frasco,
          volumen_muerto_residual, pruebas_teoricas_frasco, pruebas_teoricas_caja, volumen_total_caja, consumo_indicado,
          stock_minimo, stock_critico, precio_costo, creado_por, fecha_creacion, fecha_actualizacion
        ) VALUES (
          @codigo, @codigo_barra, @referencia, @referencia_abreviada, @presentacion, @nombre, @descripcion,
          @marca, @categoria, @unidad_negocio, @equipo_asociado, @grupo, @calibradores_asociados,
          @control_asociado, @ubicacion, @nivel, @unidad, @frascos_por_caja, @volumen_por_frasco,
          @volumen_muerto_residual, @pruebas_teoricas_frasco, @pruebas_teoricas_caja, @volumen_total_caja, @consumo_indicado,
          @stock_minimo, @stock_critico, @precio_costo, @creado_por, GETDATE(), GETDATE()
        )
        SELECT SCOPE_IDENTITY() AS Id;
      `);
      
    const insertedId = res.recordset[0].Id;
    await auditService.logEvent(
      userId || 1,
      'CREAR',
      'ITEM_INVENTARIO',
      insertedId,
      { codigo: data.codigo, nombre: data.nombre }
    );
    return { message: 'Ficha de producto creada exitosamente', id: insertedId };
  }

  async updateItem(id, data, userId) {
    const pool = await sql.connect(dbConfig);
    await this.ensureSchema(pool);

    await pool.request()
      .input('id',                       sql.Int,           parseInt(id, 10))
      .input('codigo',                  sql.NVarChar(50),  String(data.codigo || ''))
      .input('codigo_barra',            sql.NVarChar(100), data.codigo_barra ? String(data.codigo_barra) : null)
      .input('referencia',              sql.NVarChar(50),  data.referencia ? String(data.referencia) : null)
      .input('referencia_abreviada',    sql.NVarChar(50),  data.referencia_abreviada ? String(data.referencia_abreviada) : null)
      .input('presentacion',            sql.NVarChar(100), data.presentacion ? String(data.presentacion) : null)
      .input('nombre',                  sql.NVarChar(100), String(data.nombre || ''))
      .input('descripcion',             sql.NVarChar(500), data.descripcion ? String(data.descripcion) : null)
      .input('marca',                   sql.NVarChar(100), data.marca ? String(data.marca) : null)
      .input('categoria',               sql.NVarChar(50),  String(data.categoria || 'Reactivo'))
      .input('unidad_negocio',          sql.NVarChar(100), data.unidad_negocio ? String(data.unidad_negocio) : null)
      .input('equipo_asociado',         sql.NVarChar(100), data.equipo_asociado ? String(data.equipo_asociado) : null)
      .input('grupo',                   sql.NVarChar(50),  data.grupo ? String(data.grupo) : null)
      .input('calibradores_asociados',  sql.NVarChar(200), data.calibradores_asociados ? String(data.calibradores_asociados) : null)
      .input('control_asociado',        sql.NVarChar(100), data.control_asociado ? String(data.control_asociado) : null)
      .input('ubicacion',               sql.NVarChar(50),  data.ubicacion ? String(data.ubicacion) : null)
      .input('nivel',                   sql.NVarChar(50),  data.nivel ? String(data.nivel) : null)
      .input('unidad',                  sql.NVarChar(20),  String(data.unidad || 'Frasco'))
      .input('frascos_por_caja',        sql.Decimal(10,2), safeNum(data.frascos_por_caja, 1))
      .input('volumen_por_frasco',      sql.Decimal(10,4), safeNum(data.volumen_por_frasco, null))
      .input('volumen_muerto_residual', sql.Decimal(10,4), safeNum(data.volumen_muerto_residual, null))
      .input('pruebas_teoricas_frasco', sql.Decimal(10,2), safeNum(data.pruebas_teoricas_frasco, null))
      .input('pruebas_teoricas_caja',   sql.Decimal(10,2), safeNum(data.pruebas_teoricas_caja, null))
      .input('volumen_total_caja',      sql.Decimal(10,2), safeNum(data.volumen_total_caja, null))
      .input('consumo_indicado',        sql.Decimal(10,4), safeNum(data.consumo_indicado, null))
      .input('stock_minimo',            sql.Decimal(10,2), safeNum(data.stock_minimo, 0))
      .input('stock_critico',           sql.Decimal(10,2), safeNum(data.stock_critico, 0))
      .input('precio_costo',            sql.Decimal(10,2), safeNum(data.precio_costo, 0))
      .query(`
        UPDATE items_inventario SET
          codigo = @codigo, codigo_barra = @codigo_barra, referencia = @referencia,
          referencia_abreviada = @referencia_abreviada, presentacion = @presentacion, nombre = @nombre, descripcion = @descripcion,
          marca = @marca, categoria = @categoria, unidad_negocio = @unidad_negocio,
          equipo_asociado = @equipo_asociado, grupo = @grupo, calibradores_asociados = @calibradores_asociados,
          control_asociado = @control_asociado, ubicacion = @ubicacion, nivel = @nivel,
          unidad = @unidad, frascos_por_caja = @frascos_por_caja, volumen_por_frasco = @volumen_por_frasco,
          volumen_muerto_residual = @volumen_muerto_residual, pruebas_teoricas_frasco = @pruebas_teoricas_frasco,
          pruebas_teoricas_caja = @pruebas_teoricas_caja, volumen_total_caja = @volumen_total_caja,
          consumo_indicado = @consumo_indicado, stock_minimo = @stock_minimo, stock_critico = @stock_critico,
          precio_costo = @precio_costo, fecha_actualizacion = GETDATE()
        WHERE id = @id AND activo = 1
      `);
      
    await auditService.logEvent(
      userId || 1,
      'EDITAR',
      'ITEM_INVENTARIO',
      parseInt(id, 10),
      data
    );
    return { message: 'Ficha de producto actualizada exitosamente' };
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
