const express = require('express');
const router = express.Router();
const sql = require('mssql');

const { dbConfig } = require('../config/db');

// Middleware para conexión a BD
router.use(async (req, res, next) => {
  try {
    if (!req.db) {
      req.db = await sql.connect(dbConfig);
    }
    next();
  } catch (error) {
    console.error('Error de conexión a BD:', error);
    res.status(500).json({ error: 'Error de conexión a la base de datos' });
  }
});

// GET - Obtener todos los kits de prueba
router.get('/', async (req, res) => {
  try {
    const request = new sql.Request(req.db);
    const result = await request.query(`
      SELECT 
        kp.id,
        kp.codigo_kit,
        kp.nombre_kit,
        kp.descripcion,
        kp.tipo_prueba,
        kp.activo,
        kp.created_at,
        COUNT(kr.id) as reactivos_count
      FROM kits_prueba kp
      LEFT JOIN kit_reactivos kr ON kp.id = kr.id_kit
      WHERE kp.activo = 1
      GROUP BY 
        kp.id, kp.codigo_kit, kp.nombre_kit, kp.descripcion, 
        kp.tipo_prueba, kp.activo, kp.created_at
      ORDER BY kp.nombre_kit
    `);
    
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Error al obtener kits:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener los kits de prueba' 
    });
  }
});

// GET - Obtener un kit específico con sus reactivos
router.get('/:id', async (req, res) => {
  try {
    const request = new sql.Request(req.db);
    
    // Obtener información del kit
    const kitResult = await request
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM kits_prueba WHERE id = @id AND activo = 1');
    
    if (kitResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kit no encontrado'
      });
    }

    // Obtener reactivos del kit
    const reactivosResult = await request
      .input('id_kit', sql.Int, req.params.id)
      .query(`
        SELECT 
          kr.*,
          ii.nombre as nombre_reactivo,
          ii.stock_actual,
          ii.unidad as unidad_stock
        FROM kit_reactivos kr
        INNER JOIN items_inventario ii ON kr.id_reactivo = ii.id
        WHERE kr.id_kit = @id_kit
        ORDER BY kr.orden
      `);

    res.json({
      success: true,
      data: {
        ...kitResult.recordset[0],
        reactivos: reactivosResult.recordset
      }
    });
  } catch (error) {
    console.error('Error al obtener kit:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener el kit de prueba' 
    });
  }
});

// POST - Crear nuevo kit de prueba
router.post('/', async (req, res) => {
  const transaction = new sql.Transaction(req.db);
  
  try {
    await transaction.begin();
    
    const { codigo_kit, nombre_kit, tipo_prueba, descripcion, reactivos } = req.body;

    // Validaciones básicas
    if (!codigo_kit || !nombre_kit || !reactivos || reactivos.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Código, nombre y reactivos son obligatorios'
      });
    }

    // 1. Insertar el kit principal
    const kitRequest = new sql.Request(transaction);
    const kitResult = await kitRequest
      .input('codigo_kit', sql.VarChar(50), codigo_kit)
      .input('nombre_kit', sql.VarChar(255), nombre_kit)
      .input('tipo_prueba', sql.VarChar(50), tipo_prueba)
      .input('descripcion', sql.Text, descripcion)
      .query(`
        INSERT INTO kits_prueba (codigo_kit, nombre_kit, tipo_prueba, descripcion)
        OUTPUT INSERTED.id
        VALUES (@codigo_kit, @nombre_kit, @tipo_prueba, @descripcion)
      `);

    const kitId = kitResult.recordset[0].id;

    // 2. Insertar los reactivos del kit
    for (const [index, reactivo] of reactivos.entries()) {
      const reactivoRequest = new sql.Request(transaction);
      await reactivoRequest
        .input('id_kit', sql.Int, kitId)
        .input('id_reactivo', sql.Int, reactivo.id_reactivo)
        .input('cantidad_utilizada', sql.Decimal(10, 3), reactivo.cantidad_utilizada)
        .input('unidad', sql.VarChar(20), reactivo.unidad)
        .input('es_obligatorio', sql.Bit, reactivo.es_obligatorio ? 1 : 0)
        .input('orden', sql.Int, index + 1)
        .query(`
          INSERT INTO kit_reactivos 
          (id_kit, id_reactivo, cantidad_utilizada, unidad, es_obligatorio, orden)
          VALUES (@id_kit, @id_reactivo, @cantidad_utilizada, @unidad, @es_obligatorio, @orden)
        `);
    }

    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Kit creado exitosamente',
      data: { id: kitId }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear kit:', error);
    
    if (error.number === 2627) { // Violación de unique constraint
      res.status(400).json({
        success: false,
        error: 'El código del kit ya existe'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error al crear el kit de prueba'
      });
    }
  }
});

// PUT - Actualizar kit existente
router.put('/:id', async (req, res) => {
  const transaction = new sql.Transaction(req.db);
  
  try {
    await transaction.begin();
    
    const kitId = req.params.id;
    const { codigo_kit, nombre_kit, tipo_prueba, descripcion, reactivos } = req.body;

    // 1. Actualizar el kit principal
    const kitRequest = new sql.Request(transaction);
    await kitRequest
      .input('id', sql.Int, kitId)
      .input('codigo_kit', sql.VarChar(50), codigo_kit)
      .input('nombre_kit', sql.VarChar(255), nombre_kit)
      .input('tipo_prueba', sql.VarChar(50), tipo_prueba)
      .input('descripcion', sql.Text, descripcion)
      .query(`
        UPDATE kits_prueba 
        SET codigo_kit = @codigo_kit, 
            nombre_kit = @nombre_kit, 
            tipo_prueba = @tipo_prueba, 
            descripcion = @descripcion
        WHERE id = @id
      `);

    // 2. Eliminar reactivos existentes
    await kitRequest
      .input('id_kit', sql.Int, kitId)
      .query('DELETE FROM kit_reactivos WHERE id_kit = @id_kit');

    // 3. Insertar nuevos reactivos
    for (const [index, reactivo] of reactivos.entries()) {
      const reactivoRequest = new sql.Request(transaction);
      await reactivoRequest
        .input('id_kit', sql.Int, kitId)
        .input('id_reactivo', sql.Int, reactivo.id_reactivo)
        .input('cantidad_utilizada', sql.Decimal(10, 3), reactivo.cantidad_utilizada)
        .input('unidad', sql.VarChar(20), reactivo.unidad)
        .input('es_obligatorio', sql.Bit, reactivo.es_obligatorio ? 1 : 0)
        .input('orden', sql.Int, index + 1)
        .query(`
          INSERT INTO kit_reactivos 
          (id_kit, id_reactivo, cantidad_utilizada, unidad, es_obligatorio, orden)
          VALUES (@id_kit, @id_reactivo, @cantidad_utilizada, @unidad, @es_obligatorio, @orden)
        `);
    }

    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Kit actualizado exitosamente'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error al actualizar kit:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el kit de prueba'
    });
  }
});

// DELETE - Desactivar kit (eliminación lógica)
router.delete('/:id', async (req, res) => {
  try {
    const request = new sql.Request(req.db);
    await request
      .input('id', sql.Int, req.params.id)
      .query('UPDATE kits_prueba SET activo = 0 WHERE id = @id');
    
    res.json({
      success: true,
      message: 'Kit desactivado exitosamente'
    });
  } catch (error) {
    console.error('Error al desactivar kit:', error);
    res.status(500).json({
      success: false,
      error: 'Error al desactivar el kit de prueba'
    });
  }
});

// GET - Obtener reactivos disponibles para kits
router.get('/reactivos/disponibles', async (req, res) => {
  try {
    const request = new sql.Request(req.db);
    const result = await request.query(`
      SELECT 
        id,
        nombre,
        stock_actual,
        unidad,
        codigo,
        categoria as tipo_reactivo
      FROM items_inventario 
      WHERE activo = 1 AND (categoria = 'Reactivo' OR categoria = 'reactivo')
      ORDER BY nombre
    `);
    
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Error al obtener reactivos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los reactivos disponibles'
    });
  }
});

module.exports = router;