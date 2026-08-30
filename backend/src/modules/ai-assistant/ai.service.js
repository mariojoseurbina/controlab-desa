const prisma = require('../../core/prisma');

class AiService {
  async analyzeQuestion(pregunta) {
    const preguntaLower = pregunta.toLowerCase();

    // 0. ANÁLISIS DE EXÁMENES Y ANIMALES POR TIPO DE ANIMAL Y RAZA (VET)
    if (preguntaLower.includes('raza') || preguntaLower.includes('especie') || 
        preguntaLower.includes('tipo de animal') || preguntaLower.includes('pruebas por animal') || 
        preguntaLower.includes('exámenes por raza') || (preguntaLower.includes('pruebas') && preguntaLower.includes('raza')) ||
        (preguntaLower.includes('animales') && (preguntaLower.includes('raza') || preguntaLower.includes('especie')))) {
      
      const result = await prisma.$queryRaw`
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
      `;

      const breedData = result.map(row => ({
        especie: row.especie,
        raza: row.raza,
        totalExamenes: Number(row.total_examenes),
        procesados: Number(row.procesados),
        pendientes: Number(row.pendientes),
        totalAnimales: Number(row.total_animales)
      }));

      // Ordenar por exámenes totales de manera descendente
      breedData.sort((a, b) => b.totalExamenes - a.totalExamenes);

      const totalExamenes = breedData.reduce((sum, r) => sum + r.totalExamenes, 0);
      const totalProcesados = breedData.reduce((sum, r) => sum + r.procesados, 0);
      const totalPendientes = breedData.reduce((sum, r) => sum + r.pendientes, 0);
      const totalAnimales = breedData.reduce((sum, r) => sum + r.totalAnimales, 0);
      
      const listado = breedData.filter(r => r.totalExamenes > 0).map(r => 
        `• **${r.especie} (${r.raza})**:\n  • Animales Registrados: ${r.totalAnimales}\n  • Pruebas Totales: ${r.totalExamenes}\n  • Procesadas: ${r.procesados} | Pendientes: ${r.pendientes}`
      ).join('\n\n');

      return {
        respuesta: `🩺 **REPORTE OPERATIVO DE PRUEBAS Y ANIMALES POR TIPO DE ANIMAL Y RAZA**\n\n📊 **Resumen Operativo VET:**\n• Total Animales Registrados: **${totalAnimales}**\n• Total Órdenes / Pruebas: **${totalExamenes}**\n• Total Procesadas: **${totalProcesados}**\n• Total Pendientes: **${totalPendientes}**\n\n📈 **Distribución Detallada por Especie y Raza:**\n\n${listado || 'No se han registrado órdenes ni animales para ninguna especie o raza hasta el momento.'}`,
        datos: breedData,
        tipo: 'examenes_raza'
      };
    }

    // 1. ANÁLISIS DE PRECIOS Y COSTOS
    if (preguntaLower.includes('precio') || preguntaLower.includes('costo') || 
        preguntaLower.includes('valor') || preguntaLower.includes('lista de precios') ||
        preguntaLower.includes('inventario valorado') || preguntaLower.includes('costos') ||
        preguntaLower.includes('margen') || preguntaLower.includes('ganancia')) {
      
      const result = await prisma.$queryRaw`
        SELECT 
          codigo, nombre, categoria, stock_actual,
          precio_costo, precio_venta,
          (precio_venta - precio_costo) as margen,
          ROUND(((precio_venta - precio_costo) / NULLIF(precio_costo, 0)) * 100, 2) as margen_porcentaje
        FROM items_inventario 
        WHERE activo = 1 AND precio_costo > 0
        ORDER BY (precio_venta - precio_costo) DESC
      `;

      const totalCosto = result.reduce((sum, item) => sum + (Number(item.precio_costo) * item.stock_actual), 0);
      const totalVenta = result.reduce((sum, item) => sum + (Number(item.precio_venta) * item.stock_actual), 0);

      return {
        respuesta: `💰 **ANÁLISIS DE PRECIOS Y MÁRGENES**\n\n📊 **Resumen de Valores:**\n• Valor total en costo: $${totalCosto.toFixed(2)}\n• Valor total en venta: $${totalVenta.toFixed(2)}\n• Ganancia potencial: $${(totalVenta - totalCosto).toFixed(2)}\n\n📈 **Items con mejores márgenes:**\n\n${result.slice(0, 8).map(item => 
          `• ${item.nombre} (${item.codigo})\n  💵 Costo: $${Number(item.precio_costo).toFixed(2)} | Venta: $${Number(item.precio_venta).toFixed(2)}\n  📊 Margen: $${Number(item.margen)?.toFixed(2) || '0.00'} (${item.margen_porcentaje || '0'}%)\n  📦 Stock: ${item.stock_actual}`
        ).join('\n\n')}`,
        datos: result,
        tipo: 'precios_margenes'
      };
    }

    // 2. ANÁLISIS DE STOCK CRÍTICO
    if (preguntaLower.includes('crítico') || preguntaLower.includes('critico') || 
        preguntaLower.includes('bajo') || preguntaLower.includes('stock bajo') ||
        preguntaLower.includes('alertas')) {
      
      const result = await prisma.$queryRaw`
        SELECT codigo, nombre, stock_actual, stock_minimo, stock_critico, ubicacion
        FROM items_inventario 
        WHERE activo = 1 AND stock_actual <= stock_minimo
        ORDER BY stock_actual ASC
      `;

      return {
        respuesta: `📊 **ANÁLISIS DE STOCK CRÍTICO**\n\nEncontré ${result.length} items con stock bajo o crítico:\n\n${result.map(item => 
          `• ${item.nombre} (${item.codigo}): Stock ${item.stock_actual} | Mínimo ${item.stock_minimo} | ${item.stock_actual <= item.stock_critico ? '🚨 CRÍTICO' : '⚠️ BAJO'} | 📍 ${item.ubicacion || 'Sin ubicación'}`
        ).join('\n')}`,
        datos: result,
        tipo: 'stock_critico'
      };
    }

    // 3. ANÁLISIS DE VENCIMIENTOS
    if (preguntaLower.includes('vencim') || preguntaLower.includes('caduc') ||
        preguntaLower.includes('expir') || preguntaLower.includes('vencer')) {

      const result = await prisma.$queryRaw`
        SELECT codigo, nombre, stock_actual, fecha_vencimiento, ubicacion
        FROM items_inventario 
        WHERE activo = 1 AND fecha_vencimiento IS NOT NULL
        ORDER BY fecha_vencimiento ASC
      `;

      const proximos = result.filter(item =>
        new Date(item.fecha_vencimiento) > new Date()
      ).slice(0, 10);

      return {
        respuesta: `📅 **ITEMS POR VENCER**\n\n${proximos.length} items con fechas de vencimiento:\n\n${proximos.map(item =>
          `• ${item.nombre}: Vence ${new Date(item.fecha_vencimiento).toLocaleDateString('es-ES')} | Stock: ${item.stock_actual} | 📍 ${item.ubicacion || 'Sin ubicación'}`
        ).join('\n')}`,
        datos: proximos,
        tipo: 'vencimientos'
      };
    }

    // 4. BÚSQUEDA DE ITEMS
    if (preguntaLower.includes('dónde') || preguntaLower.includes('donde') ||
        preguntaLower.includes('buscar') || preguntaLower.includes('encontrar') ||
        preguntaLower.includes('ubicación') || preguntaLower.includes('ubicacion')) {

      const palabras = preguntaLower.split(' ').filter(palabra =>
        palabra.length > 3 && !['dónde', 'donde', 'buscar', 'encontrar', 'está', 'esta', 'ubicación', 'ubicacion'].includes(palabra)
      );

      if (palabras.length > 0) {
        const busqueda = `%${palabras.join(' ')}%`;
        const result = await prisma.$queryRaw`
          SELECT codigo, nombre, descripcion, stock_actual, ubicacion
          FROM items_inventario 
          WHERE activo = 1 AND (nombre LIKE ${busqueda} OR descripcion LIKE ${busqueda} OR codigo LIKE ${busqueda})
          ORDER BY nombre ASC
        `;

        return {
          respuesta: `🔍 **BÚSQUEDA: "${palabras.join(' ')}"**\n\nEncontré ${result.length} items:\n\n${result.map(item =>
            `• ${item.nombre} (${item.codigo}): ${item.descripcion || 'Sin descripción'} | Stock: ${item.stock_actual} | Ubicación: ${item.ubicacion || 'No especificada'}`
          ).join('\n')}`,
          datos: result,
          tipo: 'busqueda'
        };
      }
    }

    // 5. ANÁLISIS GENERAL DEL INVENTARIO
    if (preguntaLower.includes('resumen') || preguntaLower.includes('estado') || 
        preguntaLower.includes('general') || preguntaLower.includes('inventario') ||
        preguntaLower.includes('estadísticas') || preguntaLower.includes('estadisticas')) {
      
      const metrics = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN stock_actual <= stock_critico THEN 1 ELSE 0 END) as criticos,
          SUM(CASE WHEN stock_actual <= stock_minimo AND stock_actual > stock_critico THEN 1 ELSE 0 END) as bajos,
          SUM(CASE WHEN stock_actual > stock_minimo THEN 1 ELSE 0 END) as normales
        FROM items_inventario WHERE activo = 1
      `;

      const categorias = await prisma.$queryRaw`
        SELECT categoria, COUNT(*) as cantidad
        FROM items_inventario 
        WHERE activo = 1 
        GROUP BY categoria
        ORDER BY cantidad DESC
      `;

      return {
        respuesta: `📊 **RESUMEN GENERAL DEL INVENTARIO**\n\n• **Total items:** ${metrics[0].total}\n• **Stock normal:** ${metrics[0].normales} items\n• **Stock bajo:** ${metrics[0].bajos} items\n• **Stock crítico:** ${metrics[0].criticos} items\n\n**Distribución por categoría:**\n${categorias.map(cat =>
          `• ${cat.categoria || 'Sin Categoría'}: ${cat.cantidad} items`
        ).join('\n')}`,
        datos: {
          metrics: metrics[0],
          categorias: categorias
        },
        tipo: 'resumen'
      };
    }

    // 6. ITEMS MÁS COSTOSOS
    if (preguntaLower.includes('costoso') || preguntaLower.includes('caro')) {
      const result = await prisma.$queryRaw`
        SELECT TOP 10 codigo, nombre, precio_costo, precio_venta, stock_actual
        FROM items_inventario 
        WHERE activo = 1 AND precio_costo > 0
        ORDER BY precio_costo DESC
      `;

      return {
        respuesta: `💰 **ITEMS MÁS COSTOSOS**\n\n${result.map((item, index) =>
          `• ${item.nombre}: Costo $${Number(item.precio_costo).toFixed(2)} | Venta $${Number(item.precio_venta).toFixed(2)} | Stock: ${item.stock_actual}`
        ).join('\n')}`,
        datos: result,
        tipo: 'costosos'
      };
    }

    // 7. MOVIMIENTOS RECIENTES
    if (preguntaLower.includes('movimiento') || preguntaLower.includes('reciente') ||
        preguntaLower.includes('último') || preguntaLower.includes('ultimo') ||
        preguntaLower.includes('actividad') || preguntaLower.includes('historial')) {

      const result = await prisma.$queryRaw`
        SELECT TOP 10 
          m.tipo_movimiento, m.cantidad, m.fecha_movimiento, m.motivo, m.referencia,
          i.nombre as item_nombre, i.codigo as item_codigo, i.stock_actual
        FROM movimientos_inventario m
        INNER JOIN items_inventario i ON m.item_id = i.id
        ORDER BY m.fecha_movimiento DESC
      `;

      return {
        respuesta: `🔄 **MOVIMIENTOS RECIENTES**\n\nÚltimos 10 movimientos registrados:\n\n${result.map((mov, index) =>
          `• ${mov.item_nombre} (${mov.item_codigo})\n  📦 ${mov.tipo_movimiento} de ${mov.cantidad} unidades\n  📅 ${new Date(mov.fecha_movimiento).toLocaleDateString('es-ES')}\n  🏷️ ${mov.motivo || 'Sin motivo especificado'}\n  🔢 Referencia: ${mov.referencia || 'N/A'}`
        ).join('\n\n')}`,
        datos: result,
        tipo: 'movimientos_recientes'
      };
    }

    // 8. ANÁLISIS DE CATEGORÍAS
    if (preguntaLower.includes('categoría') || preguntaLower.includes('categoria') ||
        preguntaLower.includes('tipo') || preguntaLower.includes('clase') ||
        preguntaLower.includes('grupo')) {

      const result = await prisma.$queryRaw`
        SELECT 
          ISNULL(categoria, 'Sin Categoría') as categoria,
          COUNT(*) as total_items,
          SUM(stock_actual) as stock_total,
          AVG(precio_costo) as precio_promedio,
          SUM(CASE WHEN stock_actual <= stock_critico THEN 1 ELSE 0 END) as criticos,
          SUM(CASE WHEN stock_actual <= stock_minimo AND stock_actual > stock_critico THEN 1 ELSE 0 END) as bajos
        FROM items_inventario 
        WHERE activo = 1
        GROUP BY categoria
        ORDER BY total_items DESC
      `;

      return {
        respuesta: `🏷️ **ANÁLISIS POR CATEGORÍAS**\n\nDistribución del inventario por categoría:\n\n${result.map(cat =>
          `• ${cat.categoria}:\n  📊 ${cat.total_items} items | Stock total: ${cat.stock_total}\n  💰 Precio promedio: $${(Number(cat.precio_promedio) || 0).toFixed(2)}\n  ⚠️   ${cat.criticos} críticos | ${cat.bajos} bajos`
        ).join('\n\n')}`,
        datos: result,
        tipo: 'categorias'
      };
    }

    // 9. PRONÓSTICO DE REPOSICIÓN
    if (preguntaLower.includes('reponer') || preguntaLower.includes('reposición') ||
        preguntaLower.includes('comprar') || preguntaLower.includes('pedido') ||
        preguntaLower.includes('surtir') || preguntaLower.includes('necesito comprar')) {

      const result = await prisma.$queryRaw`
        SELECT 
          codigo, nombre, stock_actual, stock_minimo, stock_critico,
          (stock_minimo - stock_actual) as cantidad_reponer,
          proveedor, precio_costo, ubicacion,
          ((stock_minimo - stock_actual) * precio_costo) as costo_reposicion
        FROM items_inventario 
        WHERE activo = 1 AND stock_actual < stock_minimo
        ORDER BY (stock_minimo - stock_actual) DESC
      `;

      const costoTotal = result.reduce((sum, item) => sum + (Number(item.costo_reposicion) || 0), 0);
      const itemsCriticos = result.filter(item => item.stock_actual <= item.stock_critico).length;

      return {
        respuesta: `🛒 **PRONÓSTICO DE REPOSICIÓN**\n\n${result.length} items necesitan reposición (${itemsCriticos} críticos):\n\n${result.map(item =>
          `• ${item.nombre} (${item.codigo})\n  📦 Reponer: ${item.cantidad_reponer} unidades\n  🏢 Proveedor: ${item.proveedor || 'No especificado'}\n  💰 Costo: $${(Number(item.costo_reposicion) || 0).toFixed(2)}\n  📍 Ubicación: ${item.ubicacion || 'No especificada'}\n  🚨 ${item.stock_actual <= item.stock_critico ? 'CRÍTICO' : 'BAJO'}`
        ).join('\n\n')}\n\n💰 **COSTO TOTAL ESTIMADO: $${costoTotal.toFixed(2)}**\n📦 **UNIDADES TOTALES A REPONER: ${result.reduce((sum, item) => sum + item.cantidad_reponer, 0)}**`,
        datos: result,
        tipo: 'reposicion'
      };
    }

    // 10. ITEMS AGOTADOS
    if (preguntaLower.includes('agotado') || preguntaLower.includes('sin stock') ||
        preguntaLower.includes('cero') || preguntaLower.includes('agotarse') ||
        preguntaLower.includes('no hay')) {

      const result = await prisma.$queryRaw`
        SELECT codigo, nombre, stock_actual, stock_minimo, ubicacion, proveedor, categoria
        FROM items_inventario 
        WHERE activo = 1 AND stock_actual = 0
        ORDER BY nombre ASC
      `;

      return {
        respuesta: `❌ **ITEMS AGOTADOS**\n\n${result.length} items con stock en cero:\n\n${result.map(item =>
          `• ${item.nombre} (${item.codigo})\n  🏷️ Categoría: ${item.categoria || 'No especificada'}\n  📦 Mínimo requerido: ${item.stock_minimo} unidades\n  🏢 Proveedor: ${item.proveedor || 'No especificado'}\n  📍 Ubicación: ${item.ubicacion || 'No especificada'}`
        ).join('\n\n')}`,
        datos: result,
        tipo: 'agotados'
      };
    }

    // 11. ANÁLISIS DE PROVEEDORES
    if (preguntaLower.includes('proveedor') || preguntaLower.includes('proveedores') ||
        preguntaLower.includes('suplidor') || preguntaLower.includes('fabricante') ||
        preguntaLower.includes('vendor')) {

      const result = await prisma.$queryRaw`
        SELECT 
          ISNULL(proveedor, 'No Especificado') as proveedor,
          COUNT(*) as total_items,
          SUM(stock_actual) as stock_total,
          AVG(precio_costo) as precio_promedio,
          SUM(precio_costo * stock_actual) as valor_inventario,
          SUM(CASE WHEN stock_actual <= stock_critico THEN 1 ELSE 0 END) as items_criticos
        FROM items_inventario 
        WHERE activo = 1
        GROUP BY proveedor
        HAVING COUNT(*) > 0
        ORDER BY total_items DESC
      `;

      return {
        respuesta: `🏢 **ANÁLISIS DE PROVEEDORES**\n\nDistribución por proveedor:\n\n${result.map(prov =>
          `• ${prov.proveedor}:\n  📦 ${prov.total_items} items | Stock: ${prov.stock_total}\n  💰 Valor inventario: $${(Number(prov.valor_inventario) || 0).toFixed(2)}\n  📊 Precio promedio: $${(Number(prov.precio_promedio) || 0).toFixed(2)}\n  ⚠️   ${prov.items_criticos} items críticos`
        ).join('\n\n')}`,
        datos: result,
        tipo: 'proveedores'
      };
    }

    // 12. REPORTE DE REACTIVOS CON LOTES
    if (preguntaLower.includes('reactivos con lotes') ||
        preguntaLower.includes('lotes de reactivos') ||
        preguntaLower.includes('reporte de reactivos') ||
        preguntaLower.includes('stock de reactivos') ||
        preguntaLower.includes('reactivos y lotes') ||
        preguntaLower.includes('inventario de reactivos')) {

      const result = await prisma.$queryRaw`
        SELECT 
          i.id as ReactivoId,
          i.nombre as Reactivo,
          i.codigo as Codigo,
          i.unidad as Unidad,
          i.stock_actual as StockActual,
          i.stock_minimo as StockMinimo,
          lr.NumeroLote,
          lr.CantidadActual,
          lr.ConsumoPorPrueba,
          lr.FechaVencimiento,
          lr.Estado,
          DATEDIFF(DAY, GETDATE(), lr.FechaVencimiento) as DiasParaVencer
        FROM LotesReactivos lr
        INNER JOIN items_inventario i ON lr.InventarioId = i.id
        WHERE (i.activo = 1 OR i.activo IS NULL) 
          AND (i.categoria LIKE '%Reactivo%' OR i.categoria LIKE '%reactivo%')
        ORDER BY i.nombre, lr.FechaVencimiento ASC
      `;

      const totalReactivos = new Set(result.map(r => r.ReactivoId)).size;
      const totalLotes = result.length;
      const lotesVencidos = result.filter(r => r.DiasParaVencer < 0).length;
      const lotesPorVencer = result.filter(r => r.DiasParaVencer >= 0 && r.DiasParaVencer < 30).length;

      let respuestaText = `🧪 **REPORTE DE REACTIVOS CON LOTES**\n\n`;
      respuestaText += `📊 **Resumen:** ${totalReactivos} reactivos, ${totalLotes} lotes\n`;
      respuestaText += `⚠️ **Alertas:** ${lotesVencidos} vencidos, ${lotesPorVencer} por vencer\n\n`;

      // Agrupar por reactivo
      const reactivosMap = {};
      result.forEach(row => {
        if (!reactivosMap[row.ReactivoId]) {
          reactivosMap[row.ReactivoId] = {
            nombre: row.Reactivo,
            codigo: row.Codigo,
            lotes: []
          };
        }
        reactivosMap[row.ReactivoId].lotes.push(row);
      });

      Object.values(reactivosMap).forEach(reactivo => {
        respuestaText += `**${reactivo.nombre}** (${reactivo.codigo}): ${reactivo.lotes.length} lotes\n`;
        reactivo.lotes.forEach(lote => {
          const icono = lote.DiasParaVencer < 0 ? '🚨' : lote.DiasParaVencer < 30 ? '⚠️' : '✅';
          respuestaText += `  ${icono} Lote ${lote.NumeroLote}: ${lote.CantidadActual} ${reactivo.unidad || ''} | Vence: ${lote.FechaVencimiento ? new Date(lote.FechaVencimiento).toLocaleDateString('es-ES') : 'N/A'}\n`;
        });
        respuestaText += '\n';
      });

      return {
        respuesta: respuestaText,
        datos: result,
        tipo: 'reactivos_lotes'
      };
    }

    return {
      respuesta: `🤖 No entendí muy bien. Intenta preguntarme por "costos", "stock crítico" o un "resumen general".`,
      datos: [],
      tipo: 'ayuda'
    };
  }
}

module.exports = new AiService();
