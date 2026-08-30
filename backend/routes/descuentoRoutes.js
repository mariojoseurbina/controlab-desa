const express = require('express');
const router = express.Router();
const sql = require('mssql');

// ============================================================================
// CONFIGURACIÓN DE BASE DE DATOS
// ============================================================================
const { dbConfig } = require('../config/db');

// ============================================================================
// 🚀 ENDPOINT PRINCIPAL - PROCESAR JORNADA COMPLETA (DESCUENTO REAL)
// ============================================================================
router.post('/procesar-jornada', async (req, res) => {
  const { fecha } = req.body;
  
  if (!fecha) {
    return res.status(400).json({
      success: false,
      error: 'Fecha requerida'
    });
  }
  
  console.log(`🚀 INICIANDO DESCUENTO REAL PARA FECHA: ${fecha}`);
  
  let pool = null;
  
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Conexión a BD establecida');
    
    // 1. OBTENER PRUEBAS DEL DÍA CON MAPEO
    const pruebas = await pool.request()
      .input('fecha', sql.Date, fecha)
      .query(`
        SELECT 
          t.id,
          t.examen_nombre,
          t.cantidad,
          m.reactivo_id,
          m.consumo_por_prueba,
          r.nombre as reactivo_nombre
        FROM tmp_importacion_examenes t
        INNER JOIN mapeo_pruebas_reactivos m ON t.examen_nombre = m.nombre_prueba AND m.activo = 1
        INNER JOIN items_inventario r ON m.reactivo_id = r.id
        WHERE t.fecha = @fecha AND t.procesado = 0
      `);
    
    if (pruebas.recordset.length === 0) {
      await pool.close();
      return res.json({
        success: false,
        message: 'No hay pruebas mapeadas para esta fecha'
      });
    }
    
    console.log(`📊 ${pruebas.recordset.length} pruebas encontradas`);
    
    // 2. PROCESAR CADA PRUEBA (FIFO)
    const resultados = [];
    let totalML = 0;
    let exitosos = 0;
    
    for (const prueba of pruebas.recordset) {
      const mlNecesarios = prueba.cantidad * prueba.consumo_por_prueba;
      
      // Buscar lote más antiguo (FIFO)
      const lote = await pool.request()
        .input('reactivoId', sql.Int, prueba.reactivo_id)
        .query(`
          SELECT TOP 1 Id, NumeroLote, CantidadActual 
          FROM lotes_reactivos 
          WHERE InventarioId = @reactivoId 
            AND Estado = 'Activo' 
            AND CantidadActual > 0 
            AND FechaVencimiento > GETDATE()
          ORDER BY FechaFabricacion ASC
        `);
      
      if (lote.recordset.length === 0) {
        resultados.push({
          examen: prueba.examen_nombre,
          error: 'Sin lotes disponibles',
          success: false
        });
        continue;
      }
      
      const loteData = lote.recordset[0];
      
      if (loteData.CantidadActual < mlNecesarios) {
        resultados.push({
          examen: prueba.examen_nombre,
          error: `Stock insuficiente (disponible: ${loteData.CantidadActual}ml)`,
          success: false
        });
        continue;
      }
      
      // DESCONTAR DEL LOTE
      await pool.request()
        .input('loteId', sql.Int, loteData.Id)
        .input('ml', sql.Decimal(10,4), mlNecesarios)
        .input('pruebas', sql.Int, prueba.cantidad)
        .query(`
          UPDATE lotes_reactivos 
          SET CantidadActual = CantidadActual - @ml,
              PruebasRestantes = PruebasRestantes - @pruebas,
              FechaActualizacion = GETDATE()
          WHERE Id = @loteId
        `);
      
      // MARCAR PRUEBA COMO PROCESADA
      await pool.request()
        .input('pruebaId', sql.Int, prueba.id)
        .query(`UPDATE tmp_importacion_examenes SET procesado = 1 WHERE id = @pruebaId`);
      
      totalML += mlNecesarios;
      exitosos++;
      
      resultados.push({
        examen: prueba.examen_nombre,
        cantidad: prueba.cantidad,
        lote: loteData.NumeroLote,
        ml: mlNecesarios,
        success: true
      });
    }
    
    await pool.close();
    
    console.log(`✅ DESCUENTO COMPLETADO: ${exitosos} de ${pruebas.recordset.length}`);
    
    res.json({
      success: true,
      message: `Descuento aplicado: ${exitosos} de ${pruebas.recordset.length} pruebas`,
      data: {
        fecha,
        totalExamenes: pruebas.recordset.length,
        exitosos,
        fallidos: resultados.length - exitosos,
        totalML,
        detalle: resultados,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (pool) await pool.close();
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================================
// 🔍 ENDPOINT PARA VERIFICAR STOCK (OPCIONAL)
// ============================================================================
router.get('/verificar-stock', async (req, res) => {
  const { fecha } = req.query;
  
  if (!fecha) {
    return res.status(400).json({ success: false, error: 'Fecha requerida' });
  }
  
  let pool = null;
  
  try {
    pool = await sql.connect(dbConfig);
    
    const pruebas = await pool.request()
      .input('fecha', sql.Date, fecha)
      .query(`
        SELECT 
          t.examen_nombre,
          t.cantidad,
          m.reactivo_id,
          m.consumo_por_prueba,
          r.nombre as reactivo_nombre,
          ISNULL((
            SELECT TOP 1 CantidadActual 
            FROM lotes_reactivos 
            WHERE InventarioId = m.reactivo_id 
              AND Estado = 'Activo' 
              AND CantidadActual > 0 
              AND FechaVencimiento > GETDATE()
            ORDER BY FechaFabricacion ASC
          ), 0) as stock_disponible
        FROM tmp_importacion_examenes t
        INNER JOIN mapeo_pruebas_reactivos m ON t.examen_nombre = m.nombre_prueba AND m.activo = 1
        INNER JOIN items_inventario r ON m.reactivo_id = r.id
        WHERE t.fecha = @fecha AND t.procesado = 0
      `);
    
    await pool.close();
    
    const verificacion = pruebas.recordset.map(p => ({
      examen: p.examen_nombre,
      pruebas: p.cantidad,
      reactivo: p.reactivo_nombre,
      ml_necesarios: p.cantidad * p.consumo_por_prueba,
      ml_disponibles: p.stock_disponible,
      suficiente: p.stock_disponible >= (p.cantidad * p.consumo_por_prueba)
    }));
    
    res.json({
      success: true,
      fecha,
      verificacion,
      resumen: {
        total_pruebas: verificacion.length,
        suficientes: verificacion.filter(v => v.suficiente).length,
        insuficientes: verificacion.filter(v => !v.suficiente).length
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (pool) await pool.close();
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;