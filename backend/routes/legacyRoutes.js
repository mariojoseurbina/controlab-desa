const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { sql, getPool } = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Apply authentication token verification for all legacy routes (except public endpoints if any)
// router.use(authenticateToken);

// ============================================================================
// 1. ARCHIVOS EXCEL: PARSEO Y TRANSFORMACIÓN
// ============================================================================

// POST /api/transformar-reporte-diario
router.post('/transformar-reporte-diario', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió archivo Excel' });
    }
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    const pool = await getPool();
    const mapeo = await pool.request().query(`
      SELECT m.nombre_prueba, m.consumo_por_prueba, lr.NumeroLote 
      FROM mapeo_pruebas_reactivos m
      JOIN LotesReactivos lr ON m.reactivo_id = lr.InventarioId
      WHERE m.activo = 1 AND lr.Estado = 'Activo'
    `);

    const descuentos = [];

    for (const row of data) {
      const examenInput = row.Prueba || row.prueba;
      const cantidad = parseInt(row.Cantidad || row.cantidad) || 0;

      if (!examenInput || cantidad === 0) continue;

      const entradas = mapeo.recordset.filter(m =>
        m.nombre_prueba.toLowerCase() === examenInput.toString().toLowerCase().trim()
      );

      for (const entry of entradas) {
        descuentos.push({
          lote: entry.NumeroLote,
          pruebas: cantidad * entry.consumo_por_prueba,
          tipo_prueba: 'Reporte Diario',
          fecha: new Date().toISOString().split('T')[0]
        });
      }
    }

    const nuevoWorkbook = XLSX.utils.book_new();
    const nuevoSheet = XLSX.utils.json_to_sheet(descuentos);
    XLSX.utils.book_append_sheet(nuevoWorkbook, nuevoSheet, "Descuentos");

    const buffer = XLSX.write(nuevoWorkbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="descuento_automatico.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('❌ Error en transformar-reporte-diario:', error);
    res.status(500).json({ error: error.message });
  }
});

// DESCUENTO AUTOMÁTICO DESDE EXCEL
const handleDescuentoAutomatico = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se envió archivo Excel' });
    }
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const datos = XLSX.utils.sheet_to_json(worksheet);

    if (!datos || datos.length === 0) {
      return res.status(400).json({ success: false, message: 'El archivo Excel está vacío' });
    }

    const pool = await getPool();
    const resultados = [];
    const errores = [];

    for (const [index, fila] of datos.entries()) {
      try {
        const prueba = (fila.Prueba || fila.prueba || '').toString().trim();
        const cantidad = parseInt(fila.Cantidad || fila.cantidad);

        if (!prueba || isNaN(cantidad) || cantidad <= 0) {
          errores.push(`Fila ${index + 1}: Datos inválidos`);
          continue;
        }

        const mapeoResult = await pool.request()
          .input('prueba', sql.NVarChar, prueba)
          .query(`
            SELECT m.reactivo_id, m.consumo_por_prueba, r.nombre as reactivo_nombre
            FROM mapeo_pruebas_reactivos m
            INNER JOIN items_inventario r ON m.reactivo_id = r.id
            WHERE m.nombre_prueba = @prueba AND m.activo = 1 AND r.activo = 1
          `);

        if (mapeoResult.recordset.length === 0) {
          errores.push(`No hay configuración de mapeo para: ${prueba}`);
          continue;
        }

        const mapeo = mapeoResult.recordset[0];
        const consumoTotal = cantidad * mapeo.consumo_por_prueba;

        // Buscar lote activo (FIFO)
        const lotesResult = await pool.request()
          .input('reactivoId', sql.Int, mapeo.reactivo_id)
          .query(`
            SELECT TOP 1 Id, NumeroLote, CantidadActual, PruebasRestantes
            FROM LotesReactivos
            WHERE InventarioId = @reactivoId AND Estado = 'Activo' AND CantidadActual >= @consumoTotal AND FechaVencimiento > GETDATE()
            ORDER BY FechaFabricacion ASC
          `);

        if (lotesResult.recordset.length === 0) {
          errores.push(`Stock insuficiente o sin lotes activos para: ${prueba} (Requerido: ${consumoTotal}ml)`);
          continue;
        }

        const lote = lotesResult.recordset[0];

        await pool.request()
          .input('consumo', sql.Decimal(10, 3), consumoTotal)
          .input('pruebas', sql.Int, cantidad)
          .input('loteId', sql.Int, lote.Id)
          .input('reactivoId', sql.Int, mapeo.reactivo_id)
          .input('pruebaNombre', sql.NVarChar, prueba)
          .query(`
            BEGIN TRANSACTION;
            
            UPDATE LotesReactivos 
            SET CantidadActual = CantidadActual - @consumo,
                PruebasRestantes = CASE WHEN PruebasRestantes >= @pruebas THEN PruebasRestantes - @pruebas ELSE 0 END,
                FechaActualizacion = GETDATE()
            WHERE Id = @loteId;
            
            UPDATE items_inventario 
            SET stock_actual = stock_actual - @consumo
            WHERE id = @reactivoId;
            
            INSERT INTO movimientos_inventario 
            (item_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, referencia, fecha_movimiento, creado_por)
            VALUES (@reactivoId, 'CONSUMO', @consumo, 0, 0, 'Descuento automático - ' + @pruebaNombre, 'Lote: ' + (SELECT NumeroLote FROM LotesReactivos WHERE Id = @loteId), GETDATE(), 1);
            
            COMMIT TRANSACTION;
          `);

        resultados.push({
          prueba: prueba,
          cantidad_pruebas: cantidad,
          lote: lote.NumeroLote,
          reactivo: mapeo.reactivo_nombre,
          consumo_reactivo: consumoTotal,
          status: '✅ DESCONTADO'
        });

      } catch (err) {
        errores.push(`Fila ${index + 1}: ${err.message}`);
      }
    }

    res.json({
      success: resultados.length > 0,
      message: `Procesado: ${resultados.length} exitosos, ${errores.length} errores`,
      resultados: resultados,
      errores: errores
    });

  } catch (error) {
    console.error('❌ Error en descuento automático:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

router.post('/descuento-automatico-pruebas', upload.single('archivo'), handleDescuentoAutomatico);
router.post('/descuento-masivo-automatico', upload.single('archivo'), handleDescuentoAutomatico);


// ============================================================================
// 2. SISTEMA DE MAPEO EXÁMENES -> REACTIVOS
// ============================================================================

// GET /api/mapeo/pendientes
router.get('/mapeo/pendientes', async (req, res) => {
  try {
    const { fecha } = req.query;
    const fechaParam = fecha || new Date().toISOString().split('T')[0];
    const pool = await getPool();
    const result = await pool.request()
      .input('Fecha', sql.Date, fechaParam)
      .query(`
        SELECT DISTINCT
          t.examen_nombre,
          t.cantidad,
          t.fecha_importacion,
          m.reactivo_id,
          CASE WHEN m.id IS NOT NULL THEN 1 ELSE 0 END as ya_mapeado
        FROM tmp_importacion_examenes t
        LEFT JOIN mapeo_pruebas_reactivos m 
          ON t.examen_nombre = m.nombre_prueba AND m.activo = 1
        WHERE t.fecha = @Fecha AND t.procesado = 0
        ORDER BY t.cantidad DESC
      `);

    res.json({
      success: true,
      fecha: fechaParam,
      pruebas: result.recordset.filter(p => !p.ya_mapeado),
      total: result.recordset.filter(p => !p.ya_mapeado).length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/mapeo/reactivos-disponibles
router.get('/mapeo/reactivos-disponibles', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        r.id,
        r.nombre,
        r.codigo,
        r.descripcion,
        r.categoria,
        r.unidad,
        COUNT(lr.Id) as lotes_activos,
        SUM(CASE WHEN lr.Estado = 'Activo' AND lr.CantidadActual > 0 THEN 1 ELSE 0 END) as lotes_disponibles,
        AVG(lr.ConsumoPorPrueba) as consumo_promedio,
        SUM(lr.CantidadActual) as stock_total
      FROM items_inventario r
      LEFT JOIN LotesReactivos lr ON r.id = lr.InventarioId
      WHERE r.activo = 1 AND (r.categoria LIKE '%Reactivo%' OR r.categoria LIKE '%reactivo%')
      GROUP BY r.id, r.nombre, r.codigo, r.descripcion, r.categoria, r.unidad
      ORDER BY r.nombre
    `);

    res.json({
      success: true,
      reactivos: result.recordset.map(r => ({
        id: r.id,
        nombre: r.nombre,
        codigo: r.codigo,
        descripcion: r.descripcion,
        categoria: r.categoria,
        unidad: r.unidad,
        lotes_activos: r.lotes_activos || 0,
        lotes_disponibles: r.lotes_disponibles || 0,
        consumo_promedio: r.consumo_promedio || 0.25,
        stock_total: r.stock_total || 0
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/mapeo/existentes
router.get('/mapeo/existentes', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        m.nombre_prueba as examen_nombre,
        m.reactivo_id,
        r.nombre as reactivo_nombre,
        r.codigo as reactivo_codigo,
        m.consumo_por_prueba as consumo_ml,
        m.fecha_creacion,
        m.fecha_actualizacion
      FROM mapeo_pruebas_reactivos m
      LEFT JOIN items_inventario r ON m.reactivo_id = r.id
      WHERE m.activo = 1
      ORDER BY m.nombre_prueba
    `);
    res.json({
      success: true,
      mapeos: result.recordset,
      total: result.recordset.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/mapeo/masivo
router.post('/mapeo/masivo', async (req, res) => {
  try {
    const { asignaciones } = req.body;
    if (!asignaciones || !Array.isArray(asignaciones)) {
      return res.status(400).json({ success: false, message: 'Asignaciones inválidas' });
    }
    const pool = await getPool();
    let exitosos = 0;
    const errores = [];

    for (const asignacion of asignaciones) {
      try {
        const checkResult = await pool.request()
          .input('nombre_prueba', sql.NVarChar, asignacion.examen_nombre)
          .query(`SELECT id FROM mapeo_pruebas_reactivos WHERE nombre_prueba = @nombre_prueba AND activo = 1`);

        if (checkResult.recordset.length > 0) {
          await pool.request()
            .input('nombre_prueba', sql.NVarChar, asignacion.examen_nombre)
            .input('reactivo_id', sql.Int, asignacion.reactivo_id)
            .input('consumo', sql.Decimal(10, 3), asignacion.consumo_por_prueba || 0.25)
            .query(`
              UPDATE mapeo_pruebas_reactivos 
              SET reactivo_id = @reactivo_id, consumo_por_prueba = @consumo, fecha_actualizacion = GETDATE()
              WHERE nombre_prueba = @nombre_prueba AND activo = 1
            `);
        } else {
          await pool.request()
            .input('nombre_prueba', sql.NVarChar, asignacion.examen_nombre)
            .input('reactivo_id', sql.Int, asignacion.reactivo_id)
            .input('consumo', sql.Decimal(10, 3), asignacion.consumo_por_prueba || 0.25)
            .query(`
              INSERT INTO mapeo_pruebas_reactivos 
              (nombre_prueba, reactivo_id, consumo_por_prueba, activo, tipo_mapeo, prioridad, fecha_creacion, fecha_actualizacion)
              VALUES (@nombre_prueba, @reactivo_id, @consumo, 1, 'DIRECTO', 1, GETDATE(), GETDATE())
            `);
        }
        exitosos++;
      } catch (err) {
        errores.push({ examen: asignacion.examen_nombre, error: err.message });
      }
    }
    res.json({
      success: exitosos > 0,
      message: `${exitosos} mapeos guardados correctamente`,
      exitosos,
      errores
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/mapeo/masivo (Para el componente de descuento por pruebas)
router.get('/mapeo/masivo', async (req, res) => {
  let fechaParam = req.query.fecha || new Date().toISOString().split('T')[0];
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('fecha', sql.Date, fechaParam)
      .query(`
        SELECT 
          t.id as examen_id,
          t.examen_nombre,
          t.cantidad as pruebas,
          t.procesado,
          MAX(CASE WHEN m.id IS NOT NULL THEN 1 ELSE 0 END) as ya_mapeado,
          MAX(m.reactivo_id) as reactivo_id,
          MAX(m.consumo_por_prueba) as consumo_por_prueba,
          MAX(r.nombre) as reactivo_nombre
        FROM tmp_importacion_examenes t
        LEFT JOIN mapeo_pruebas_reactivos m 
          ON t.examen_nombre = m.nombre_prueba AND m.activo = 1
        LEFT JOIN items_inventario r 
          ON m.reactivo_id = r.id
        WHERE t.fecha = @fecha AND (t.procesado = 0 OR t.procesado IS NULL)
        GROUP BY t.id, t.examen_nombre, t.cantidad, t.procesado
        ORDER BY t.cantidad DESC
      `);

    const examenes = result.recordset.map(row => ({
      examen_id: row.examen_id,
      examen_nombre: row.examen_nombre,
      pruebas: row.pruebas,
      ya_mapeado: row.ya_mapeado === 1,
      reactivo_id: row.reactivo_id,
      reactivo_nombre: row.reactivo_nombre || 'No configurado',
      consumo_ml: row.consumo_por_prueba || 0,
      seleccionado: false
    }));

    res.json({
      success: true,
      fecha: fechaParam,
      examenes: examenes,
      total: examenes.length,
      mapeados: examenes.filter(e => e.ya_mapeado).length
    });
  } catch (error) {
    console.error('❌ Error en GET /mapeo/masivo:', error);
    res.json({ success: false, examenes: [], total: 0 });
  }
});

// POST /api/mapeo/sugerir-lote
router.post('/mapeo/sugerir-lote', async (req, res) => {
  try {
    const { examenes, examen_nombre } = req.body;
    const pool = await getPool();
    
    const listExamenes = Array.isArray(examenes) 
      ? examenes 
      : examen_nombre 
        ? [examen_nombre] 
        : [];
        
    const sugerenciasFinales = [];
    
    for (const ex of listExamenes) {
      const lotesResult = await pool.request()
        .input('examen', sql.NVarChar, ex)
        .query(`
          SELECT 
            lr.Id as id,
            lr.NumeroLote as NumeroLote,
            i.nombre as nombre,
            i.codigo as codigo,
            i.unidad as unidad,
            lr.CantidadActual as CantidadActual,
            lr.ConsumoPorPrueba as consumo_por_prueba,
            lr.FechaVencimiento as FechaVencimiento,
            DATEDIFF(DAY, GETDATE(), lr.FechaVencimiento) as dias_para_vencer,
            lr.Rendimiento as Rendimiento
          FROM LotesReactivos lr
          INNER JOIN items_inventario i ON lr.InventarioId = i.id
          WHERE lr.Estado = 'Activo'
            AND lr.FechaVencimiento > GETDATE()
            AND i.activo = 1
            AND (
              i.nombre LIKE '%' + @examen + '%' 
              OR @examen LIKE '%' + i.nombre + '%'
              OR EXISTS (
                SELECT 1 FROM mapeo_pruebas_reactivos mpr 
                WHERE mpr.reactivo_id = i.id 
                  AND mpr.nombre_prueba LIKE '%' + @examen + '%'
              )
            )
          ORDER BY lr.FechaVencimiento ASC, lr.Rendimiento DESC
        `);
        
      sugerenciasFinales.push({
        examen: ex,
        sugerencias: lotesResult.recordset || []
      });
    }
    
    if (!Array.isArray(examenes) && examen_nombre) {
      return res.json({
        success: true,
        sugerencias: sugerenciasFinales[0]?.sugerencias || [],
        mensaje: sugerenciasFinales[0]?.sugerencias.length > 0 ? 'Encontrados' : 'No sugerencias'
      });
    }
    
    res.json({
      success: true,
      sugerencias: sugerenciasFinales
    });
    
  } catch (error) {
    console.error('❌ Error en sugerir-lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/mapeo/guardar-masivo
router.post('/mapeo/guardar-masivo', async (req, res) => {
  try {
    const { mapeos } = req.body;
    if (!mapeos || !Array.isArray(mapeos) || mapeos.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay mapeos válidos' });
    }
    const pool = await getPool();
    let guardados = 0;
    
    for (const m of mapeos) {
      if (!m.examen || !m.reactivo_id) continue;
      
      await pool.request()
        .input('nombre_prueba', sql.NVarChar, m.examen)
        .input('reactivo_id', sql.Int, m.reactivo_id)
        .input('consumo', sql.Decimal(10, 3), m.consumo_por_prueba || 0.25)
        .query(`
          IF EXISTS (SELECT 1 FROM mapeo_pruebas_reactivos WHERE nombre_prueba = @nombre_prueba AND activo = 1)
          BEGIN
            UPDATE mapeo_pruebas_reactivos 
            SET reactivo_id = @reactivo_id, consumo_por_prueba = @consumo, fecha_actualizacion = GETDATE()
            WHERE nombre_prueba = @nombre_prueba AND activo = 1
          END
          ELSE
          BEGIN
            INSERT INTO mapeo_pruebas_reactivos 
            (nombre_prueba, reactivo_id, consumo_por_prueba, activo, tipo_mapeo, prioridad, fecha_creacion, fecha_actualizacion)
            VALUES (@nombre_prueba, @reactivo_id, @consumo, 1, 'DIRECTO', 1, GETDATE(), GETDATE())
          END
        `);
        
      guardados++;
    }
    
    res.json({
      success: true,
      message: `Mapeo guardado exitosamente: ${guardados} exámenes mapeados`,
      registros: guardados
    });
  } catch (error) {
    console.error('❌ Error guardando mapeo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================================================
// 3. PROCESAMIENTO DE DESCUENTOS DIARIOS (CÁLCULO E IMPORTACIÓN)
// ============================================================================

// POST /api/descuentos/importar
router.post('/descuentos/importar', async (req, res) => {
  const { fecha } = req.body;
  if (!fecha) {
    return res.status(400).json({ success: false, message: 'La fecha es requerida' });
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('Fecha', sql.Date, fecha)
      .execute('sp_ImportarEstadisticasDiarias');
      
    const data = result.recordset[0] || {};
    res.json({
      success: true,
      data: {
        estado: data.estado || 'Importación exitosa',
        fecha: fecha,
        examenes_importados: data.examenes_importados || 0,
        total_pruebas: data.total_pruebas || 0,
        mensaje: data.estado || 'Procesado'
      }
    });
  } catch (error) {
    console.error('❌ Error importando pruebas:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/descuentos/pruebas-dia
router.get('/descuentos/pruebas-dia', async (req, res) => {
  const { fecha } = req.query;
  if (!fecha) {
    return res.status(400).json({ success: false, message: 'La fecha es requerida' });
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('Fecha', sql.Date, fecha)
      .query(`
        SELECT id, fecha, examen_nombre, cantidad, procesado, fecha_importacion
        FROM tmp_importacion_examenes
        WHERE fecha = @Fecha
        ORDER BY cantidad DESC
      `);
      
    const examenes = result.recordset || [];
    const totalExamenes = examenes.length;
    const totalPruebas = examenes.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    
    // Calcular cuántos exámenes tienen mapeo
    const mappingsResult = await pool.request().query(`
      SELECT DISTINCT nombre_prueba FROM mapeo_pruebas_reactivos WHERE activo = 1
    `);
    const activeMappings = new Set(mappingsResult.recordset.map(m => m.nombre_prueba.toLowerCase().trim()));
    
    let conMapeo = 0;
    let sinMapeo = 0;
    examenes.forEach(e => {
      if (activeMappings.has(e.examen_nombre.toLowerCase().trim())) {
        conMapeo++;
      } else {
        sinMapeo++;
      }
    });

    res.json({
      success: true,
      data: examenes,
      estadisticas: {
        totalExamenes,
        totalPruebas,
        conMapeo,
        sinMapeo
      }
    });
  } catch (error) {
    console.error('❌ Error en pruebas-dia:', error);
    res.json({
      success: true,
      data: [],
      estadisticas: { totalExamenes: 0, totalPruebas: 0, conMapeo: 0, sinMapeo: 0 }
    });
  }
});

// GET /api/descuentos/calcular-dia
router.get('/descuentos/calcular-dia', async (req, res) => {
  const { fecha } = req.query;
  if (!fecha) {
    return res.status(400).json({ success: false, message: 'La fecha es requerida' });
  }
  try {
    const pool = await getPool();
    
    // Obtener exámenes
    const examenesResult = await pool.request()
      .input('fecha', sql.Date, fecha)
      .query(`
        SELECT examen_nombre, SUM(cantidad) as cantidad
        FROM tmp_importacion_examenes
        WHERE fecha = @fecha AND (procesado = 0 OR procesado IS NULL)
        GROUP BY examen_nombre
      `);
      
    const examenes = examenesResult.recordset || [];
    
    // Obtener mapeos
    const mappingsResult = await pool.request().query(`
      SELECT nombre_prueba, reactivo_id, consumo_por_prueba
      FROM mapeo_pruebas_reactivos
      WHERE activo = 1
    `);
    const mappingsMap = {};
    mappingsResult.recordset.forEach(m => {
      mappingsMap[m.nombre_prueba.toLowerCase().trim()] = m;
    });

    const reactivosReport = {};
    let totalMLGeneral = 0;
    let totalExamenesMapeados = 0;
    let totalPruebasGeneradas = 0;
    
    for (const ex of examenes) {
      const key = ex.examen_nombre.toLowerCase().trim();
      const mapping = mappingsMap[key];
      if (mapping) {
        const reactivoId = mapping.reactivo_id;
        const consumo = mapping.consumo_por_prueba;
        const ml = ex.cantidad * consumo;
        
        totalMLGeneral += ml;
        totalExamenesMapeados++;
        totalPruebasGeneradas += ex.cantidad;
        
        if (!reactivosReport[reactivoId]) {
          reactivosReport[reactivoId] = {
            reactivo_id: reactivoId,
            nombre: '',
            codigo: '',
            total_ml: 0,
            ml_sin_cubrir: 0,
            examenes: [],
            lotes_utilizados: []
          };
        }
        
        reactivosReport[reactivoId].total_ml += ml;
        reactivosReport[reactivoId].examenes.push({
          examen: ex.examen_nombre,
          pruebas: ex.cantidad,
          consumo_por_prueba: consumo,
          ml: ml
        });
      }
    }
    
    const reactivoIds = Object.keys(reactivosReport).map(Number);
    
    if (reactivoIds.length > 0) {
      const reactivosInfo = await pool.request().query(`
        SELECT id, nombre, codigo
        FROM items_inventario
        WHERE id IN (${reactivoIds.join(',')})
      `);
      
      reactivosInfo.recordset.forEach(r => {
        if (reactivosReport[r.id]) {
          reactivosReport[r.id].nombre = r.nombre;
          reactivosReport[r.id].codigo = r.codigo;
        }
      });
      
      const lotesResult = await pool.request().query(`
        SELECT Id, InventarioId, NumeroLote, CantidadActual, ConsumoPorPrueba, FechaVencimiento,
               DATEDIFF(DAY, GETDATE(), FechaVencimiento) as dias_para_vencer
        FROM LotesReactivos
        WHERE InventarioId IN (${reactivoIds.join(',')}) AND Estado = 'Activo' AND CantidadActual > 0
        ORDER BY InventarioId, FechaFabricacion ASC
      `);
      
      const lotesByReactivo = {};
      lotesResult.recordset.forEach(l => {
        if (!lotesByReactivo[l.InventarioId]) {
          lotesByReactivo[l.InventarioId] = [];
        }
        lotesByReactivo[l.InventarioId].push(l);
      });
      
      for (const rId of reactivoIds) {
        const report = reactivosReport[rId];
        const lotes = lotesByReactivo[rId] || [];
        let mlNeeded = report.total_ml;
        
        for (const l of lotes) {
          if (mlNeeded <= 0) break;
          
          const mlToTake = Math.min(mlNeeded, l.CantidadActual);
          report.lotes_utilizados.push({
            numero_lote: l.NumeroLote,
            fecha_vencimiento: l.FechaVencimiento,
            dias_para_vencer: l.dias_para_vencer,
            ml_disponibles: l.CantidadActual,
            ml_a_descontar: mlToTake,
            ml_restantes: l.CantidadActual - mlToTake
          });
          
          mlNeeded -= mlToTake;
        }
        
        report.ml_sin_cubrir = mlNeeded;
      }
    }
    
    res.json({
      success: true,
      datos: {
        total_examenes: totalExamenesMapeados,
        total_pruebas: totalPruebasGeneradas,
        total_reactivos: reactivoIds.length,
        total_ml: parseFloat(totalMLGeneral.toFixed(2)),
        reactivos: Object.values(reactivosReport)
      }
    });
    
  } catch (error) {
    console.error('❌ Error en calcular-dia:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/descuentos/ejecutar
router.post('/descuentos/ejecutar', async (req, res) => {
  const { fecha, modo } = req.body;
  const fechaParam = fecha || new Date().toISOString().split('T')[0];
  const modoParam = modo || 'real';
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('Fecha', sql.Date, fechaParam)
      .input('ModoSimulacion', sql.Bit, modoParam === 'simulacion' ? 1 : 0)
      .execute('sp_DescontarConMapeoExistente');
      
    res.json({
      success: true,
      message: `Descuento ejecutado en modo ${modoParam}`,
      fecha: fechaParam,
      modo: modoParam
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/descuentos/limpiar-consumos
router.post('/descuentos/limpiar-consumos', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query(`
      UPDATE mapeo_pruebas_reactivos SET consumo_por_prueba = 0.00 WHERE activo = 1
    `);
    res.json({ success: true, message: 'Consumos limpiados correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/descuentos/estadisticas
router.get('/descuentos/estadisticas', async (req, res) => {
  const { fecha } = req.query;
  const fechaParam = fecha || new Date().toISOString().split('T')[0];
  try {
    const pool = await getPool();
    const statsResult = await pool.request()
      .input('Fecha', sql.Date, fechaParam)
      .query(`
        SELECT COUNT(*) as total_examenes, SUM(cantidad) as total_pruebas,
               SUM(CASE WHEN procesado = 1 THEN 1 ELSE 0 END) as procesados,
               SUM(CASE WHEN procesado = 0 THEN 1 ELSE 0 END) as pendientes
        FROM tmp_importacion_examenes WHERE fecha = @Fecha
      `);
    res.json({
      success: true,
      fecha: fechaParam,
      estadisticas: {
        generales: statsResult.recordset[0] || {}
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================================================
// 4. DESCUENTOS GENERALES
// ============================================================================

// POST /api/descuento-simple
router.post('/descuento-simple', async (req, res) => {
  console.log('🎯 DESCUENTO SIMPLE - Fecha:', req.body.fecha);

  const { fecha } = req.body;
  if (!fecha) {
    return res.status(400).json({ success: false, error: 'Fecha requerida' });
  }

  try {
    const pool = await getPool();
    const pruebas = await pool.request()
      .input('fecha', sql.Date, fecha)
      .query(`
        SELECT 
          t.id,
          t.examen_nombre,
          t.cantidad,
          m.reactivo_id,
          r.nombre as reactivo_nombre,
          m.consumo_por_prueba
        FROM tmp_importacion_examenes t
        INNER JOIN mapeo_pruebas_reactivos m ON t.examen_nombre = m.nombre_prueba AND m.activo = 1
        INNER JOIN items_inventario r ON m.reactivo_id = r.id
        WHERE t.fecha = @fecha AND t.procesado = 0
      `);

    if (pruebas.recordset.length === 0) {
      return res.json({ success: false, message: 'No hay pruebas mapeadas para esta fecha' });
    }


    const resultados = [];
    let totalML = 0;
    let exitosos = 0;

    for (const prueba of pruebas.recordset) {
      let mlNecesarios = prueba.cantidad * prueba.consumo_por_prueba;
      const mlOriginal = mlNecesarios;

      const loteResult = await pool.request()
        .input('reactivoId', sql.Int, prueba.reactivo_id)
        .query(`
          SELECT Id, NumeroLote, CantidadActual
          FROM LotesReactivos
          WHERE InventarioId = @reactivoId AND Estado = 'Activo' AND CantidadActual > 0 AND FechaVencimiento > GETDATE()
          ORDER BY FechaFabricacion ASC
        `);

      const lotesDisponibles = loteResult.recordset;
      const totalDisponible = lotesDisponibles.reduce((acc, l) => acc + l.CantidadActual, 0);

      if (totalDisponible < mlNecesarios) {
        resultados.push({
          examen: prueba.examen_nombre,
          error: 'Sin lotes disponibles con stock suficiente',
          success: false
        });
        continue;
      }

      let lotesUsadosStr = [];
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        for (const lote of lotesDisponibles) {
          if (mlNecesarios <= 0) break;
          
          const mlToTake = Math.min(mlNecesarios, lote.CantidadActual);
          const pruebasToTake = (mlToTake / mlOriginal) * prueba.cantidad;

          const req = new sql.Request(transaction);
          await req
            .input('loteId', sql.Int, lote.Id)
            .input('ml', sql.Decimal(10, 3), mlToTake)
            .input('pruebas', sql.Int, pruebasToTake)
            .input('reactivoId', sql.Int, prueba.reactivo_id)
            .input('pruebaId', sql.Int, prueba.id)
            .query(`
              UPDATE LotesReactivos 
              SET CantidadActual = CantidadActual - @ml,
                  PruebasRestantes = CASE WHEN PruebasRestantes >= @pruebas THEN PruebasRestantes - @pruebas ELSE 0 END,
                  FechaActualizacion = GETDATE()
              WHERE Id = @loteId;
              
              UPDATE items_inventario 
              SET stock_actual = stock_actual - @ml
              WHERE id = @reactivoId;
              
              INSERT INTO movimientos_inventario 
              (item_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, referencia, fecha_movimiento, creado_por)
              VALUES (@reactivoId, 'CONSUMO', @ml, 0, 0, 'Descuento simple - ' + (SELECT examen_nombre FROM tmp_importacion_examenes WHERE id = @pruebaId), 'Lote: ' + (SELECT NumeroLote FROM LotesReactivos WHERE Id = @loteId), GETDATE(), 1);
            `);
          
          mlNecesarios -= mlToTake;
          lotesUsadosStr.push(lote.NumeroLote);
        }

        const reqFinal = new sql.Request(transaction);
        await reqFinal
          .input('pruebaIdFinal', sql.Int, prueba.id)
          .query(`
            UPDATE tmp_importacion_examenes 
            SET procesado = 1, fecha_procesamiento = GETDATE() 
            WHERE id = @pruebaIdFinal;
          `);

        await transaction.commit();

        totalML += mlOriginal;
        exitosos++;
        resultados.push({
          examen: prueba.examen_nombre,
          cantidad: prueba.cantidad,
          lote: lotesUsadosStr.join(', '),
          ml: mlOriginal,
          success: true
        });
      } catch (err) {
        await transaction.rollback();
        console.error('Error descontando prueba:', err);
        resultados.push({
          examen: prueba.examen_nombre,
          error: 'Error interno descontando reactivo',
          success: false
        });
      }
    }

    res.json({
      success: true,
      message: `Procesados ${exitosos} de ${pruebas.recordset.length}`,
      data: {
        fecha,
        totalExamenes: pruebas.recordset.length,
        exitosos,
        fallidos: resultados.length - exitosos,
        totalML,
        detalle: resultados
      }
    });

  } catch (error) {
    console.error('❌ Error en descuento-simple:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/descuento-directo
router.post('/descuento-directo', async (req, res) => {
  console.log('🎯 DESCUENTO DIRECTO - Fecha:', req.body.fecha);

  const { fecha } = req.body;
  if (!fecha) {
    return res.status(400).json({ success: false, error: 'Fecha requerida' });
  }

  try {
    const pool = await getPool();
    const pruebas = await pool.request()
      .input('fecha', sql.Date, fecha)
      .query(`
        SELECT 
          t.id,
          t.examen_nombre,
          t.cantidad,
          m.reactivo_id,
          r.nombre as reactivo_nombre,
          m.consumo_por_prueba
        FROM tmp_importacion_examenes t
        INNER JOIN mapeo_pruebas_reactivos m ON t.examen_nombre = m.nombre_prueba AND m.activo = 1
        INNER JOIN items_inventario r ON m.reactivo_id = r.id
        WHERE t.fecha = @fecha AND t.procesado = 0
      `);

    if (pruebas.recordset.length === 0) {
      return res.json({ success: false, message: 'No hay pruebas mapeadas para esta fecha' });
    }


    const resultados = [];
    let totalML = 0;
    let exitosos = 0;

    for (const prueba of pruebas.recordset) {
      let mlNecesarios = prueba.cantidad * prueba.consumo_por_prueba;
      const mlOriginal = mlNecesarios;

      const loteResult = await pool.request()
        .input('reactivoId', sql.Int, prueba.reactivo_id)
        .query(`
          SELECT Id, NumeroLote, CantidadActual
          FROM LotesReactivos
          WHERE InventarioId = @reactivoId AND Estado = 'Activo' AND CantidadActual > 0 AND FechaVencimiento > GETDATE()
          ORDER BY FechaFabricacion ASC
        `);

      const lotesDisponibles = loteResult.recordset;
      const totalDisponible = lotesDisponibles.reduce((acc, l) => acc + l.CantidadActual, 0);

      if (totalDisponible < mlNecesarios) {
        resultados.push({
          examen: prueba.examen_nombre,
          error: 'Sin lotes disponibles con stock suficiente',
          success: false
        });
        continue;
      }

      let lotesUsadosStr = [];
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        for (const lote of lotesDisponibles) {
          if (mlNecesarios <= 0) break;
          
          const mlToTake = Math.min(mlNecesarios, lote.CantidadActual);
          const pruebasToTake = (mlToTake / mlOriginal) * prueba.cantidad;

          const req = new sql.Request(transaction);
          await req
            .input('loteId', sql.Int, lote.Id)
            .input('ml', sql.Decimal(10, 3), mlToTake)
            .input('pruebas', sql.Int, pruebasToTake)
            .input('reactivoId', sql.Int, prueba.reactivo_id)
            .input('pruebaId', sql.Int, prueba.id)
            .query(`
              UPDATE LotesReactivos 
              SET CantidadActual = CantidadActual - @ml,
                  PruebasRestantes = CASE WHEN PruebasRestantes >= @pruebas THEN PruebasRestantes - @pruebas ELSE 0 END,
                  FechaActualizacion = GETDATE()
              WHERE Id = @loteId;
              
              UPDATE items_inventario 
              SET stock_actual = stock_actual - @ml
              WHERE id = @reactivoId;
              
              INSERT INTO movimientos_inventario 
              (item_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, referencia, fecha_movimiento, creado_por)
              VALUES (@reactivoId, 'CONSUMO', @ml, 0, 0, 'Descuento directo - ' + (SELECT examen_nombre FROM tmp_importacion_examenes WHERE id = @pruebaId), 'Lote: ' + (SELECT NumeroLote FROM LotesReactivos WHERE Id = @loteId), GETDATE(), 1);
            `);
          
          mlNecesarios -= mlToTake;
          lotesUsadosStr.push(lote.NumeroLote);
        }

        const reqFinal = new sql.Request(transaction);
        await reqFinal
          .input('pruebaIdFinal', sql.Int, prueba.id)
          .query(`
            UPDATE tmp_importacion_examenes 
            SET procesado = 1, fecha_procesamiento = GETDATE() 
            WHERE id = @pruebaIdFinal;
          `);

        await transaction.commit();

        totalML += mlOriginal;
        exitosos++;
        resultados.push({
          examen: prueba.examen_nombre,
          cantidad: prueba.cantidad,
          lote: lotesUsadosStr.join(', '),
          ml: mlOriginal,
          success: true
        });
      } catch (err) {
        await transaction.rollback();
        console.error('Error descontando prueba:', err);
        resultados.push({
          examen: prueba.examen_nombre,
          error: 'Error interno descontando reactivo',
          success: false
        });
      }
    }

    res.json({
      success: true,
      message: `Procesados ${exitosos} de ${pruebas.recordset.length}`,
      data: {
        fecha,
        totalExamenes: pruebas.recordset.length,
        exitosos,
        fallidos: resultados.length - exitosos,
        totalML,
        detalle: resultados
      }
    });

  } catch (error) {
    console.error('❌ Error en descuento-directo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
