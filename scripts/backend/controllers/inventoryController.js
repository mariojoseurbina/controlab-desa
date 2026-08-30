const sql = require('mssql');

const getAllItems = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    
    const result = await pool.request().query(`
      SELECT * FROM items_inventario 
      WHERE activo = 1 
      ORDER BY fecha_creacion DESC
    `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error obteniendo items:', error);
    res.status(500).json({ error: 'Error obteniendo items del inventario' });
  }
};

const createItem = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      codigo, nombre, descripcion, categoria, unidad, stock_actual,
      stock_minimo, stock_critico, proveedor, precio_costo, precio_venta,
      ubicacion, fecha_vencimiento
    } = req.body;

    const result = await pool.request()
      .input('codigo', sql.VarChar, codigo)
      .input('nombre', sql.VarChar, nombre)
      .input('descripcion', sql.Text, descripcion)
      .input('categoria', sql.VarChar, categoria)
      .input('unidad', sql.VarChar, unidad)
      .input('stock_actual', sql.Decimal(10,2), stock_actual)
      .input('stock_minimo', sql.Decimal(10,2), stock_minimo)
      .input('stock_critico', sql.Decimal(10,2), stock_critico)
      .input('proveedor', sql.VarChar, proveedor)
      .input('precio_costo', sql.Decimal(10,2), precio_costo)
      .input('precio_venta', sql.Decimal(10,2), precio_venta)
      .input('ubicacion', sql.VarChar, ubicacion)
      .input('fecha_vencimiento', sql.Date, fecha_vencimiento)
      .input('creado_por', sql.Int, req.user.id)
      .query(`
        INSERT INTO items_inventario (
          codigo, nombre, descripcion, categoria, unidad, stock_actual,
          stock_minimo, stock_critico, proveedor, precio_costo, precio_venta,
          ubicacion, fecha_vencimiento, creado_por, fecha_creacion, activo
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @codigo, @nombre, @descripcion, @categoria, @unidad, @stock_actual,
          @stock_minimo, @stock_critico, @proveedor, @precio_costo, @precio_venta,
          @ubicacion, @fecha_vencimiento, @creado_por, GETDATE(), 1
        )
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('Error creando item:', error);
    res.status(500).json({ error: 'Error creando item en inventario' });
  }
};

module.exports = { getAllItems, createItem };