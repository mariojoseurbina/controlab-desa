const express = require('express');
const router = express.Router();
const sql = require('mssql');

const { dbConfig } = require('../config/db');

// 🚀 ENDPOINT ÚNICO Y EXCLUSIVO PARA DESCUENTO
router.post('/procesar-descuento-seguro', async (req, res) => {
  const { fecha } = req.body;
  
  if (!fecha) {
    return res.status(400).json({ success: false, error: 'Fecha requerida' });
  }

  console.log(`🚀 INICIANDO DESCUENTO SEGURO PARA FECHA: ${fecha}`);
  
  let pool = null;
  
  try {
    // 1. CONECTAR
    pool = await sql.connect(dbConfig);
    console.log('✅ Conectado a BD');
    
    // 2. OBTENER PRUEBAS DEL DÍA
    const pruebasQuery = await pool.request()
      .input('fecha', sql.Date, fecha)
      .query(`
        SELECT id, examen_nombre, cantidad 
        FROM tmp_importacion_examenes 
        WHERE fecha = @fecha AND procesado = 0
      `);
    
    const pruebas = pruebasQuery.recordset;
    
    if (pruebas.length === 0) {
      return res.json({ success: false, message: 'No hay pruebas pendientes' });
    }
    
    // 3. OBTENER MAPEOS
    const mapeoQuery = await pool.request()
      .query(`SELECT nombre_prueba, reactivo_id, consumo_por_prueba FROM mapeo_pruebas_reactivos WHERE activo = 1`);
    
    const mapeos = {};
    mapeoQuery.recordset.forEach(m => {
      mapeos[m.nombre_prueba] = m;
    });
    
    // 4. PROCESAR CADA PRUEBA
    const resultados = [];
    let totalML = 0;
    
    for (const prueba of pruebas) {
      const mapeo = mapeos[prueba.examen_nombre];
      
      if (!mapeo) {
        resultados.push({
          examen: prueba.examen_nombre,
          error: 'Sin mapeo',
          success: false
        });
        continue;
      }
      
      const mlNecesarios = prueba.cantidad * mapeo.consumo_por_prueba;
      
      // Buscar lotes disponibles
      const lotesQuery = await pool.request()
        .input('reactivoId', sql.Int, mapeo.reactivo_id)
        .query(`
          SELECT TOP 1 Id, NumeroLote, CantidadActual 
          FROM lotes_reactivos 
          WHERE InventarioId = @reactivoId 
            AND Estado = 'Activo' 
            AND CantidadActual > 0 
            AND FechaVencimiento > GETDATE()
          ORDER BY FechaFabricacion ASC
        `);
      
      const lote = lotesQuery.recordset[0];
      
      if (!lote) {
        resultados.push({
          examen: prueba.examen_nombre,
          error: 'Sin lotes disponibles',
          success: false
        });
        continue;
      }
      
      if (lote.CantidadActual < mlNecesarios) {
        resultados.push({
          examen: prueba.examen_nombre,
          error: `Stock insuficiente (disponible: ${lote.CantidadActual}ml, necesario: ${mlNecesarios}ml)`,
          success: false
        });
        continue;
      }
      
      // DESCONTAR
      await pool.request()
        .input('loteId', sql.Int, lote.Id)
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
      
      resultados.push({
        examen: prueba.examen_nombre,
        cantidad: prueba.cantidad,
        lote: lote.NumeroLote,
        ml: mlNecesarios,
        success: true
      });
    }
    
    // 5. RESPUESTA
    const exitosos = resultados.filter(r => r.success);
    
    res.json({
      success: exitosos.length > 0,
      message: `Procesados ${exitosos.length}/${pruebas.length} exámenes`,
      data: {
        fecha,
        totalExamenes: pruebas.length,
        exitosos: exitosos.length,
        fallidos: resultados.length - exitosos.length,
        totalML: totalML,
        detalle: resultados
      }
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // ✅ SOLO AQUÍ CERRAMOS LA CONEXIÓN - AL FINAL DE TODO
    if (pool) {
      try {
        await pool.close();
        console.log('🔌 Conexión cerrada');
      } catch (e) {
        console.error('Error cerrando conexión:', e);
      }
    }
  }
});

module.exports = router;