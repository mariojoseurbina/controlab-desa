const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { sql, getPool } = require('../config/database');
const XLSX = require('xlsx');

const router = express.Router();

// Apply auth to all reports
router.use(authenticateToken);

// GET /api/reports/precios-inventario
router.get('/precios-inventario', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT 
          id, codigo, nombre, descripcion, categoria, unidad,
          stock_actual, stock_minimo, stock_maximo, stock_critico,
          proveedor, precio_costo, precio_venta, ubicacion,
          (precio_venta - precio_costo) as margen_ganancia,
          ROUND(((precio_venta - precio_costo) / NULLIF(precio_costo, 0)) * 100, 2) as margen_porcentaje,
          CASE 
            WHEN stock_actual <= stock_critico THEN 'CRÍTICO'
            WHEN stock_actual <= stock_minimo THEN 'BAJO' 
            ELSE 'NORMAL'
          END as estado_stock
        FROM items_inventario 
        WHERE activo = 1
        ORDER BY categoria, nombre
      `);

    const totales = result.recordset.reduce((acc, item) => ({
      valorCosto: acc.valorCosto + (item.precio_costo * item.stock_actual),
      valorVenta: acc.valorVenta + (item.precio_venta * item.stock_actual),
      itemsCriticos: acc.itemsCriticos + (item.stock_actual <= item.stock_critico ? 1 : 0)
    }), { valorCosto: 0, valorVenta: 0, itemsCriticos: 0 });

    res.json({
      success: true,
      items: result.recordset,
      totales: totales,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en reporte precios:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/precios-resumen
router.get('/precios-resumen', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT 
          categoria,
          COUNT(*) as total_items,
          AVG(precio_costo) as precio_costo_promedio,
          AVG(precio_venta) as precio_venta_promedio,
          SUM(precio_costo * stock_actual) as valor_inventario_costo,
          SUM(precio_venta * stock_actual) as valor_inventario_venta
        FROM items_inventario 
        WHERE activo = 1
        GROUP BY categoria
        ORDER BY valor_inventario_costo DESC
      `);

    res.json({
      success: true,
      resumen: result.recordset,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en reporte resumen precios:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/expensive-items
router.get('/expensive-items', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT TOP 10 codigo, nombre, precio_costo, precio_venta, stock_actual
        FROM items_inventario 
        WHERE activo = 1 AND precio_costo > 0
        ORDER BY precio_costo DESC
      `);

    res.json({ items: result.recordset });

  } catch (error) {
    console.error('❌ Error en reporte costosos:', error.message);
    res.status(500).json({ error: 'Error generando reporte' });
  }
});

// GET /api/reports/exportar-excel/precios
router.get('/exportar-excel/precios', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT 
          codigo,
          nombre,
          categoria,
          unidad,
          stock_actual,
          precio_costo,
          precio_venta,
          (precio_venta - precio_costo) as margen_ganancia,
          ROUND(((precio_venta - precio_costo) / NULLIF(precio_costo, 0)) * 100, 2) as margen_porcentaje,
          proveedor,
          ubicacion,
          CASE 
            WHEN stock_actual <= stock_critico THEN 'CRÍTICO'
            WHEN stock_actual <= stock_minimo THEN 'BAJO' 
            ELSE 'NORMAL'
          END as estado_stock
        FROM items_inventario 
        WHERE activo = 1
        ORDER BY categoria, nombre
      `);

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(result.recordset);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lista de Precios");

    const totalCosto = result.recordset.reduce((sum, item) => sum + (item.precio_costo * item.stock_actual), 0);
    const totalVenta = result.recordset.reduce((sum, item) => sum + (item.precio_venta * item.stock_actual), 0);
    const gananciaPotencial = totalVenta - totalCosto;

    const resumenData = [
      { 'METRICA': 'Valor total en costo', 'VALOR': `$${totalCosto.toFixed(2)}` },
      { 'METRICA': 'Valor total en venta', 'VALOR': `$${totalVenta.toFixed(2)}` },
      { 'METRICA': 'Ganancia potencial', 'VALOR': `$${gananciaPotencial.toFixed(2)}` },
      { 'METRICA': 'Total items', 'VALOR': result.recordset.length },
      { 'METRICA': 'Items con stock crítico', 'VALOR': result.recordset.filter(item => item.estado_stock === 'CRÍTICO').length }
    ];

    const resumenSheet = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen");

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="reporte_precios_inventario.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);

  } catch (error) {
    console.error('❌ Error exportando a Excel:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/reports/exportar-excel/ia
router.post('/exportar-excel/ia', async (req, res) => {
  try {
    const { datos, nombreReporte } = req.body;

    if (!datos) {
      return res.status(400).json({ success: false, error: 'Datos inválidos para exportar' });
    }

    const workbook = XLSX.utils.book_new();

    if (Array.isArray(datos)) {
      const worksheet = XLSX.utils.json_to_sheet(datos);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte IA");
    } else if (typeof datos === 'object') {
      // Si es un objeto compuesto (con claves que apuntan a arreglos o sub-objetos)
      let hasSheets = false;
      for (const [key, val] of Object.entries(datos)) {
        const sheetName = key.substring(0, 31).replace(/[*?:\\/\[\]]/g, ''); // Limpiar caracteres no permitidos en nombres de hojas
        if (Array.isArray(val)) {
          if (val.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(val);
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Datos");
            hasSheets = true;
          }
        } else if (typeof val === 'object' && val !== null) {
          const worksheet = XLSX.utils.json_to_sheet([val]);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Detalle");
          hasSheets = true;
        } else if (val !== null && val !== undefined) {
          const worksheet = XLSX.utils.json_to_sheet([{ metrica: key, valor: val }]);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Info");
          hasSheets = true;
        }
      }
      if (!hasSheets) {
        // En caso de que el objeto esté vacío, agregar una hoja vacía
        const worksheet = XLSX.utils.json_to_sheet([{ mensaje: "Sin datos disponibles" }]);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
      }
    } else {
      // Si es un tipo de dato plano (string, number)
      const worksheet = XLSX.utils.json_to_sheet([{ reporte: datos.toString() }]);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const nombreArchivo = nombreReporte
      ? `reporte_${nombreReporte.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
      : 'reporte_ia.xlsx';

    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);

  } catch (error) {
    console.error('❌ Error exportando reporte IA:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/reactivos-lotes
router.get('/reactivos-lotes', async (req, res) => {
  try {
    console.log('🧪 Generando reporte específico de reactivos con lotes...');

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        i.id as ReactivoId,
        i.nombre as Reactivo,
        i.codigo as Codigo,
        i.descripcion as Descripcion,
        i.unidad as Unidad,
        i.stock_actual as StockActual,
        i.stock_minimo as StockMinimo,
        i.stock_maximo as StockMaximo,
        i.proveedor as Proveedor,
        lr.Id as LoteId,
        lr.NumeroLote,
        lr.CantidadActual,
        lr.ConsumoPorPrueba,
        lr.FechaVencimiento,
        lr.FechaFabricacion,
        lr.PruebasTeoricas,
        lr.PruebasRestantes,
        lr.Rendimiento,
        lr.TemperaturaAlmacenamiento,
        lr.Estado,
        DATEDIFF(DAY, GETDATE(), lr.FechaVencimiento) as DiasParaVencer,
        CASE 
          WHEN lr.Rendimiento >= 95 THEN 'EXCELENTE'
          WHEN lr.Rendimiento >= 85 THEN 'ÓPTIMO' 
          WHEN lr.Rendimiento >= 75 THEN 'ACEPTABLE'
          ELSE 'MEJORABLE'
        END as NivelRendimiento,
        CASE 
          WHEN DATEDIFF(DAY, GETDATE(), lr.FechaVencimiento) < 0 THEN 'VENCIDO'
          WHEN DATEDIFF(DAY, GETDATE(), lr.FechaVencimiento) < 30 THEN 'POR VENCER'
          ELSE 'VIGENTE'
        END as EstadoVencimiento
      FROM LotesReactivos lr
      INNER JOIN items_inventario i ON lr.InventarioId = i.id
      WHERE (i.activo = 1 OR i.activo IS NULL) 
        AND (i.categoria LIKE '%Reactivo%' OR i.categoria LIKE '%reactivo%')
      ORDER BY i.nombre, lr.FechaVencimiento ASC
    `);

    const reactivosMap = {};
    let totalReactivos = 0;
    let totalLotes = 0;
    let totalStock = 0;
    let lotesVencidos = 0;
    let lotesPorVencer = 0;

    result.recordset.forEach(row => {
      if (!reactivosMap[row.ReactivoId]) {
        reactivosMap[row.ReactivoId] = {
          nombre: row.Reactivo,
          codigo: row.Codigo,
          unidad: row.Unidad,
          stock_actual: row.StockActual,
          stock_minimo: row.StockMinimo,
          lotes: [],
          stockTotalLotes: 0,
          pruebasTeoricasTotales: 0,
          pruebasRestantesTotales: 0
        };
        totalReactivos++;
      }

      const pruebasTeoricas = row.PruebasTeoricas ||
        (row.ConsumoPorPrueba > 0 ? Math.floor(row.CantidadActual / row.ConsumoPorPrueba) : 0);

      const pruebasRestantes = row.PruebasRestantes ||
        (row.ConsumoPorPrueba > 0 ? Math.floor(row.CantidadActual / row.ConsumoPorPrueba) : 0);

      reactivosMap[row.ReactivoId].lotes.push({
        numeroLote: row.NumeroLote,
        cantidadActual: row.CantidadActual,
        consumoPorPrueba: row.ConsumoPorPrueba,
        fechaVencimiento: row.FechaVencimiento,
        fechaFabricacion: row.FechaFabricacion,
        pruebasTeoricas: pruebasTeoricas,
        pruebasRestantes: pruebasRestantes,
        rendimiento: row.Rendimiento,
        nivelRendimiento: row.NivelRendimiento,
        estado: row.Estado,
        diasParaVencer: row.DiasParaVencer,
        estadoVencimiento: row.EstadoVencimiento
      });

      reactivosMap[row.ReactivoId].stockTotalLotes += row.CantidadActual;
      reactivosMap[row.ReactivoId].pruebasTeoricasTotales += pruebasTeoricas;
      reactivosMap[row.ReactivoId].pruebasRestantesTotales += pruebasRestantes;

      totalLotes++;
      totalStock += row.CantidadActual;

      if (row.DiasParaVencer < 0) lotesVencidos++;
      if (row.DiasParaVencer >= 0 && row.DiasParaVencer < 30) lotesPorVencer++;
    });

    const reactivosFormateados = Object.values(reactivosMap).map(reactivo => ({
      ...reactivo,
      lotes: reactivo.lotes.map(lote => ({
        ...lote,
        fechaVencimiento: lote.fechaVencimiento ? new Date(lote.fechaVencimiento).toISOString().split('T')[0] : null,
        fechaFabricacion: lote.fechaFabricacion ? new Date(lote.fechaFabricacion).toISOString().split('T')[0] : null
      }))
    }));

    console.log(`✅ Reporte generado: ${totalReactivos} reactivos, ${totalLotes} lotes`);

    res.json({
      success: true,
      data: {
        reactivos: reactivosFormateados,
        resumen: {
          totalReactivos: totalReactivos,
          totalLotes: totalLotes,
          totalStock: totalStock,
          lotesVencidos: lotesVencidos,
          lotesPorVencer: lotesPorVencer,
          lotesVigentes: totalLotes - lotesVencidos - lotesPorVencer
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error en reporte específico de reactivos:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error al generar el reporte de reactivos con lotes'
    });
  }
});

// GET /api/reports/vet/dashboard
router.get('/vet/dashboard', async (req, res) => {
  try {
    const pool = await getPool();
    
    // 1. Estadísticas de especies
    const especiesResult = await pool.request().query(`
      SELECT 
        e.nombre as especie,
        COUNT(ev.id) as total_examenes,
        SUM(CASE WHEN ev.estado = 'PROCESADO' THEN 1 ELSE 0 END) as procesados,
        SUM(CASE WHEN ev.estado = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN ev.estado = 'PARCIAL' THEN 1 ELSE 0 END) as parciales,
        COUNT(DISTINCT ev.animal_id) as total_animales
      FROM especies_vet e
      LEFT JOIN animales_vet a ON a.especie_id = e.id
      LEFT JOIN examenes_veterinario ev ON ev.animal_id = a.id
      GROUP BY e.nombre
      ORDER BY total_examenes DESC
    `);

    // 2. Alertas clínicas (resultados fuera de rango)
    const alertasResult = await pool.request().query(`
      SELECT TOP 20
        ev.codigo_orden,
        a.identificador as animal_identificador,
        a.nombre as animal_nombre,
        e.nombre as especie,
        p.nombre as parametro,
        re.valor_numerico,
        re.valor_texto,
        re.fuera_rango
      FROM resultados_examen re
      INNER JOIN examenes_veterinario ev ON re.examen_id = ev.id
      INNER JOIN animales_vet a ON ev.animal_id = a.id
      INNER JOIN especies_vet e ON a.especie_id = e.id
      INNER JOIN parametros_examen p ON re.parametro_id = p.id
      WHERE re.fuera_rango = 1
      ORDER BY ev.fecha_muestra DESC
    `);

    // 3. Productividad por día
    const productividadResult = await pool.request().query(`
      SELECT 
        CAST(fecha_muestra as DATE) as fecha,
        COUNT(*) as total_ordenes,
        SUM(CASE WHEN estado = 'PROCESADO' THEN 1 ELSE 0 END) as procesadas,
        SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'PARCIAL' THEN 1 ELSE 0 END) as parciales
      FROM examenes_veterinario
      WHERE fecha_muestra >= DATEADD(day, -30, GETDATE())
      GROUP BY CAST(fecha_muestra as DATE)
      ORDER BY CAST(fecha_muestra as DATE) ASC
    `);

     // Formatear fechas de productividad
    const productividadFormateada = productividadResult.recordset.map(p => ({
      ...p,
      fecha: p.fecha ? new Date(p.fecha).toISOString().split('T')[0] : null
    }));

    // 4. Estadísticas de exámenes por tipo de animal (especie) y raza (detallado)
    const razasResult = await pool.request().query(`
      SELECT 
        e.nombre as especie,
        ISNULL(r.nombre, 'Mestizo / Indeterminado') as raza,
        COUNT(ev.id) as total_examenes,
        SUM(CASE WHEN ev.estado = 'PROCESADO' THEN 1 ELSE 0 END) as procesados,
        SUM(CASE WHEN ev.estado = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
        COUNT(DISTINCT a.id) as total_animales
      FROM animales_vet a
      INNER JOIN especies_vet e ON a.especie_id = e.id
      LEFT JOIN razas_vet r ON a.raza_id = r.id
      LEFT JOIN examenes_veterinario ev ON ev.animal_id = a.id
      GROUP BY e.nombre, r.nombre
      ORDER BY total_examenes DESC
    `);

    const razasData = razasResult.recordset.map(row => ({
      especie: row.especie,
      raza: row.raza,
      totalExamenes: row.total_examenes,
      procesados: row.procesados,
      pendientes: row.pendientes,
      totalAnimales: row.total_animales
    }));

    res.json({
      success: true,
      data: {
        especies: especiesResult.recordset,
        alertas: alertasResult.recordset,
        productividad: productividadFormateada,
        razas: razasData,
        resumenGeneral: {
          totalOrdenes: especiesResult.recordset.reduce((acc, row) => acc + row.total_examenes, 0),
          totalProcesados: especiesResult.recordset.reduce((acc, row) => acc + row.procesados, 0),
          totalPendientes: especiesResult.recordset.reduce((acc, row) => acc + row.pendientes, 0),
          totalAnimales: especiesResult.recordset.reduce((acc, row) => acc + row.total_animales, 0)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en reporte veterinario consolidado:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
const inventoryTools = require('../src/modules/agent/tools/inventoryTools');

// --- ENDPOINTS PARA REPORTES RÁPIDOS (DATAGRID) ---

router.get('/quick/stock-critico', async (req, res) => {
  try {
    const data = await inventoryTools.checkInventory({ filterLowStock: true });
    // Agregar ID para el DataGrid
    const arr = (Array.isArray(data) ? data : []).map((d, i) => ({ id: i, ...d }));
    res.json({ success: true, data: arr });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/quick/vencimientos', async (req, res) => {
  try {
    const data = await inventoryTools.checkExpiringLots({ daysUntilExpiration: 60 });
    const arr = (Array.isArray(data) ? data : []).map((d, i) => ({ id: i, ...d }));
    res.json({ success: true, data: arr });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/quick/mermas', async (req, res) => {
  try {
    const data = await inventoryTools.checkShrinkageCauses({ days: 90 });
    const arr = Object.entries(data.desgloseMermas || {}).map(([motivo, cantidad], id) => ({ id, motivo, cantidad }));
    res.json({ success: true, data: arr });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/quick/compras-pendientes', async (req, res) => {
  try {
    const data = await inventoryTools.checkPendingPurchases();
    const arr = (Array.isArray(data) ? data : []).map((d, id) => ({ id, ...d }));
    res.json({ success: true, data: arr });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/quick/movimientos', async (req, res) => {
  try {
    const { almacenId } = req.query;
    const movementsService = require('../services/movementsService');
    const data = await movementsService.getAllMovements(almacenId);
    
    const formatted = data.map((d, id) => ({
      id,
      Producto: `${d.item_codigo} - ${d.item_nombre}`,
      Tipo: d.tipo_movimiento,
      Cantidad: d.cantidad,
      Origen: d.almacen_nombre,
      Destino: d.almacen_destino_nombre !== 'N/A' ? d.almacen_destino_nombre : '—',
      Referencia: d.referencia || '—',
      Motivo: d.motivo || '—',
      Fecha: d.fecha_movimiento ? new Date(d.fecha_movimiento).toLocaleString('es-VE') : '—'
    }));
    res.json({ success: true, data: formatted });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

const costTools = require('../src/modules/agent/tools/costTools');

router.get('/quick/valor-financiero', async (req, res) => {
  try {
    const { executeQuery } = require('../config/database');
    const items = await executeQuery(`
      SELECT 
        id,
        codigo,
        nombre,
        categoria,
        ISNULL(equipo_asociado, 'General') as equipo_asociado,
        ISNULL(marca, 'N/A') as marca,
        ISNULL(precio_costo, 0) as precio_unitario_base_usd,
        ISNULL(stock_actual, 0) as stock_actual,
        ROUND(ISNULL(stock_actual, 0) * ISNULL(precio_costo, 0), 2) as valor_inmovilizado_stock_usd
      FROM items_inventario
      WHERE activo = 1
      ORDER BY nombre ASC
    `);

    let totalPrecioBase = 0;
    let totalStock = 0;
    let totalValorInmovilizado = 0;

    const formattedData = items.map((item, idx) => {
      const precioBase = Number(item.precio_unitario_base_usd) || 0;
      const stock = Number(item.stock_actual) || 0;
      const valorInmovilizado = Number(item.valor_inmovilizado_stock_usd) || (stock * precioBase);

      totalPrecioBase += precioBase;
      totalStock += stock;
      totalValorInmovilizado += valorInmovilizado;

      return {
        id: item.id || idx + 1,
        Codigo_Interno: item.codigo,
        Nombre_Producto: item.nombre,
        Categoria: item.categoria,
        Equipo_Asociado: item.equipo_asociado,
        Marca: item.marca,
        Precio_Unitario_Base_USD: parseFloat(precioBase.toFixed(2)),
        Stock_Actual: stock,
        Valor_Inmovilizado_USD: parseFloat(valorInmovilizado.toFixed(2))
      };
    });

    formattedData.push({
      id: 99999,
      Codigo_Interno: '--- TOTALES ---',
      Nombre_Producto: 'RESUMEN GLOBAL VALORIZADO',
      Categoria: 'TODAS',
      Equipo_Asociado: 'TODOS',
      Marca: 'TODAS',
      Precio_Unitario_Base_USD: parseFloat(totalPrecioBase.toFixed(2)),
      Stock_Actual: totalStock,
      Valor_Inmovilizado_USD: parseFloat(totalValorInmovilizado.toFixed(2))
    });

    res.json({ success: true, data: formattedData });
  } catch (error) { 
    res.status(500).json({ success: false, error: error.message }); 
  }
});

router.get('/quick/top-consumos', async (req, res) => {
  try {
    const data = await inventoryTools.getTopConsumptions({ days: 30, limit: 15 });
    const arr = (Array.isArray(data) ? data : []).map((d, id) => ({ id, ...d }));
    res.json({ success: true, data: arr });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/quick/rentabilidad', async (req, res) => {
  try {
    const data = await costTools.calculateTestMargins({});
    const arr = (Array.isArray(data) ? data : []).map((d, id) => ({ id, ...d }));
    res.json({ success: true, data: arr });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/quick/descuentos-hoy', async (req, res) => {
  try {
    const { getPool, sql } = require('../config/db.js');
    const pool = await getPool();
    
    // Get current stock
    const stockResult = await pool.request().query(`
      SELECT i.nombre as reactivo_nombre, i.codigo, i.stock_actual, SUM(l.CantidadActual) as stock_lotes
      FROM items_inventario i
      LEFT JOIN LotesReactivos l ON i.id = l.InventarioId AND l.Estado = 'Activo'
      WHERE i.activo = 1 AND i.categoria = 'Reactivo'
      GROUP BY i.nombre, i.codigo, i.stock_actual
    `);

    // Get recent discounts
    const consumeResult = await pool.request().query(`
      SELECT i.nombre as reactivo_nombre, SUM(m.cantidad) as total_descontado, MAX(m.fecha_movimiento) as ultimo_descuento
      FROM movimientos_inventario m
      INNER JOIN items_inventario i ON m.item_id = i.id
      WHERE m.tipo_movimiento = 'CONSUMO' AND CAST(m.fecha_movimiento as DATE) = CAST(GETDATE() as DATE)
      GROUP BY i.nombre
    `);

    const consumeMap = {};
    consumeResult.recordset.forEach(r => {
      consumeMap[r.reactivo_nombre] = r;
    });

    const combined = stockResult.recordset.filter(r => r.stock_lotes > 0 || r.stock_actual > 0 || consumeMap[r.reactivo_nombre]).map((r, id) => {
      const consumido = consumeMap[r.reactivo_nombre];
      return {
        id,
        reactivo_nombre: r.reactivo_nombre,
        codigo: r.codigo,
        consumido_hoy_ml: consumido ? consumido.total_descontado : 0,
        ultimo_descuento: consumido ? consumido.ultimo_descuento : null,
        stock_restante_teorico: r.stock_actual,
        stock_en_lotes_activos: r.stock_lotes || 0,
        estado: r.stock_lotes < 10 ? 'BAJO STOCK' : 'ESTABLE'
      };
    });
    
    // Sort so the ones with consumption today are on top
    combined.sort((a, b) => b.consumido_hoy_ml - a.consumido_hoy_ml);

    res.json({ success: true, data: combined });
  } catch (error) { 
    res.status(500).json({ success: false, error: error.message }); 
  }
});

module.exports = router;