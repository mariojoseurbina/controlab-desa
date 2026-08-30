const inventoryTools = require('./tools/inventoryTools');
const costTools = require('./tools/costTools');
const snifferTools = require('./tools/snifferTools');
const { getPool } = require('../../../config/db.js');

// Función auxiliar para quitar acentos y normalizar texto
function normalizarTexto(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remueve tildes
}

async function handleOfflinePrompt(prompt) {
  const cleanPrompt = normalizarTexto(prompt);
  let pool;
  
  // Diagnóstico rápido de conexión a la Base de Datos para evitar bloqueos
  try {
    pool = await getPool();
    await Promise.race([
      pool.request().query("SELECT 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 2500))
    ]);
  } catch (dbError) {
    console.error("[Agent Offline] Error de conexión a la base de datos:", dbError.message);
    return {
      respuesta: `❌ **Error de Conexión a la Base de Datos**\n\nEl Cerebro de Controlab no puede comunicarse con tu base de datos local en esta laptop.\n\n**Para solucionarlo de inmediato:**\n1. Asegúrate de haber ejecutado el archivo **\`Restaurar_BD.bat\`** que viene en la carpeta para cargar los datos.\n2. Verifica que el servicio de **SQL Server (MSSQLSERVER)** esté iniciado en el Administrador de Tareas de Windows.\n3. Revisa que las credenciales en tu archivo \`backend/.env\` coincidan con tu SQL Server local.\n\n*Detalle del error:* ${dbError.message}`,
      fuente: 'Controlab Brain (Diagnóstico de Conexión)'
    };
  }

  try {
    // ---------------------------------------------------------
    // MÓDULO 6: AUDITORÍA (SNIFFER)
    // ---------------------------------------------------------
    if (cleanPrompt.includes('sniffer') || cleanPrompt.includes('auditoria') || cleanPrompt.includes('red')) {
      console.log("[Agent Offline] Intención detectada: Reporte del Sniffer");
      const reporteMarkdown = await snifferTools.snifferToolsFunctions.obtenerReporteDiarioSniffer({});
      return { respuesta: reporteMarkdown, fuente: 'Controlab Brain' };
    }

    // ---------------------------------------------------------
    // MÓDULO 1: INVENTARIO Y ALMACÉN
    // ---------------------------------------------------------
    if (cleanPrompt.includes('reactivo') && cleanPrompt.includes('stock') && cleanPrompt.includes('bajo')) {
      console.log("[Agent Offline] Intención detectada: Stock Bajo");
      const data = await inventoryTools.checkInventory({ filterLowStock: true });
      let res = `### 📉 Reporte de Reactivos con Stock Bajo\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      if (data.length === 0) return { respuesta: res + `✅ Inventario sano. Ningún reactivo por debajo del mínimo.`, fuente: 'Controlab Brain' };
      data.forEach(i => res += `- **${i.nombre}**: Stock actual **${i.stockActual}** (Min: ${i.stockMinimo})\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('valor financiero') || cleanPrompt.includes('inmovilizado')) {
      const data = await inventoryTools.checkInventoryValue();
      let res = `### 💎 Valor Financiero del Inventario Inmovilizado\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      res += `- **Valor Total Global:** $${data.valorTotalInmovilizado}\n\n#### Desglose por Categoría:\n`;
      for (const [cat, val] of Object.entries(data.desglosePorCategoria)) {
        res += `- ${cat}: $${val.toFixed(2)}\n`;
      }
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('proporcion') || cleanPrompt.includes('distribuido por categorias')) {
      const data = await inventoryTools.checkInventoryProportions();
      let res = `### 📊 Proporción del Inventario por Categorías\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      data.proporciones.forEach(p => res += `- **${p.categoria}**: ${p.cantidadTotalItems} items (${p.porcentajeDelTotal})\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('sobrecompra') || cleanPrompt.includes('stock maximo')) {
      const data = await inventoryTools.checkOverstock();
      let res = `### ⚠️ Reporte de Sobrecompra (Exceso de Stock)\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      if (data.totalItemsConSobrecompra === 0) return { respuesta: res + `✅ No hay ítems que superen el stock máximo.`, fuente: 'Controlab Brain' };
      res += `Se detectaron ${data.totalItemsConSobrecompra} ítems con sobrecompra:\n`;
      data.detalle.forEach(i => res += `- **${i.item}**: Exceso de ${i.exceso} unidades (Actual: ${i.stockActual}, Max: ${i.stockMaximoPermitido})\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('movimientos de salida') && !cleanPrompt.includes('entrada')) {
      let targetMonth = null;
      let monthName = "Últimos 30 días";
      if (cleanPrompt.includes('mayo')) { targetMonth = 5; monthName = "Mayo"; }
      else if (cleanPrompt.includes('junio')) { targetMonth = 6; monthName = "Junio"; }
      else if (cleanPrompt.includes('julio')) { targetMonth = 7; monthName = "Julio"; }

      const data = await inventoryTools.getRecentMovements({ filterType: 'OUT', days: 30, targetMonth });
      let res = `### 📤 Historial de Salidas de Inventario (${monthName})\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      if (data.length === 0) return { respuesta: res + `✅ No se han registrado salidas en este periodo.`, fuente: 'Controlab Brain' };
      data.forEach(m => res += `- **${new Date(m.fecha).toLocaleDateString()}**: Salida de ${m.cantidad} uds de **${m.item}** (Motivo: ${m.motivo}). Realizado por: ${m.usuario}.\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('movimiento') || (cleanPrompt.includes('entrada') && cleanPrompt.includes('salida')) || cleanPrompt.includes('reporte de la sucursal') || cleanPrompt.includes('kardex')) {
      let targetMonth = null;
      let monthName = "Últimos 30 días";
      
      if (cleanPrompt.includes('enero')) { targetMonth = 1; monthName = "Enero"; }
      else if (cleanPrompt.includes('febrero')) { targetMonth = 2; monthName = "Febrero"; }
      else if (cleanPrompt.includes('marzo')) { targetMonth = 3; monthName = "Marzo"; }
      else if (cleanPrompt.includes('abril')) { targetMonth = 4; monthName = "Abril"; }
      else if (cleanPrompt.includes('mayo')) { targetMonth = 5; monthName = "Mayo"; }
      else if (cleanPrompt.includes('junio')) { targetMonth = 6; monthName = "Junio"; }
      else if (cleanPrompt.includes('julio')) { targetMonth = 7; monthName = "Julio"; }
      else if (cleanPrompt.includes('agosto')) { targetMonth = 8; monthName = "Agosto"; }
      else if (cleanPrompt.includes('septiembre')) { targetMonth = 9; monthName = "Septiembre"; }
      else if (cleanPrompt.includes('octubre')) { targetMonth = 10; monthName = "Octubre"; }
      else if (cleanPrompt.includes('noviembre')) { targetMonth = 11; monthName = "Noviembre"; }
      else if (cleanPrompt.includes('diciembre')) { targetMonth = 12; monthName = "Diciembre"; }

      // Resolver Almacén
      let targetAlmacenId = null;
      let targetAlmacenName = "";
      if (cleanPrompt.includes('chacao')) {
        const dbAlmacen = await pool.request().query("SELECT id, nombre FROM almacenes WHERE nombre LIKE '%chacao%'");
        if (dbAlmacen.recordset.length > 0) {
          targetAlmacenId = dbAlmacen.recordset[0].id;
          targetAlmacenName = dbAlmacen.recordset[0].nombre;
        }
      } else if (cleanPrompt.includes('mercedes')) {
        const dbAlmacen = await pool.request().query("SELECT id, nombre FROM almacenes WHERE nombre LIKE '%mercedes%'");
        if (dbAlmacen.recordset.length > 0) {
          targetAlmacenId = dbAlmacen.recordset[0].id;
          targetAlmacenName = dbAlmacen.recordset[0].nombre;
        }
      } else if (cleanPrompt.includes('central')) {
        const dbAlmacen = await pool.request().query("SELECT id, nombre FROM almacenes WHERE nombre LIKE '%central%'");
        if (dbAlmacen.recordset.length > 0) {
          targetAlmacenId = dbAlmacen.recordset[0].id;
          targetAlmacenName = dbAlmacen.recordset[0].nombre;
        }
      }

      const data = await inventoryTools.getRecentMovements({ 
        filterType: 'ALL', 
        days: 30, 
        targetMonth, 
        almacenId: targetAlmacenId 
      });

      let subTitle = targetAlmacenName ? ` para ${targetAlmacenName}` : "";
      let res = `### 🔄 Historial de Movimientos (${monthName}${subTitle})\n\n`;
      
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      if (data.length === 0) return { respuesta: res + `✅ No se han registrado movimientos en este periodo.`, fuente: 'Controlab Brain' };
      
      data.slice(0, 30).forEach(m => {
        let det = ``;
        if (m.tipo === 'TRANSFERENCIA') {
          det = `enviado de **${m.origen}** a **${m.destino}**`;
        } else {
          det = `en **${m.origen}**`;
        }
        res += `- **${new Date(m.fecha).toLocaleDateString('es-VE')}** [${m.tipo}]: ${m.cantidad} uds de **${m.item}** ${det} (Motivo: ${m.motivo}). Realizado por: ${m.usuario}.\n`;
      });
      
      if (data.length > 30) {
        res += `\n*(Se muestran los 30 movimientos más recientes de un total de ${data.length})*`;
      }
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('promedio') && cleanPrompt.includes('dias') && cleanPrompt.includes('almacen')) {
      const data = await inventoryTools.checkAverageStorageDays();
      let res = `### 📦 Promedio de Días en Almacén\n\n`;
      if (data.error || data.mensaje) return { respuesta: res + (data.error || data.mensaje), fuente: 'Controlab Brain' };
      res += `El promedio histórico que un reactivo pasa en el almacén antes de agotarse al 100% es de **${data.promedioDiasAlmacenadosAntesDeAgotarse} días**.`;
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    // ---------------------------------------------------------
    // MÓDULO 2: VENCIMIENTOS Y MERMAS
    // ---------------------------------------------------------
    if (cleanPrompt.includes('lote') && cleanPrompt.includes('vence')) {
      console.log("[Agent Offline] Intención detectada: Vencimientos");
      const data = await inventoryTools.checkExpiringLots({ daysUntilExpiration: 60 });
      let res = `### ⏳ Reporte de Lotes Próximos a Vencer (60 días)\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      if (data.length === 0) return { respuesta: res + `✅ No hay lotes por expirar pronto.`, fuente: 'Controlab Brain' };
      data.forEach(l => {
        const fechaStr = new Date(l.fechaVencimiento).toLocaleDateString();
        res += `- **${l.reactivo}** (Lote: ${l.lote}): Vence el **${fechaStr}**. Quedan ${l.cantidadRestante} ${l.unidad}.\n`;
      });
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('vencido') && cleanPrompt.includes('activo')) {
      const data = await inventoryTools.checkExpiredActiveLots();
      let res = `### 🚨 Lotes Vencidos pero Activos en Sistema\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      if (data.length === 0) return { respuesta: res + `✅ Todos los lotes vencidos han sido dados de baja correctamente.`, fuente: 'Controlab Brain' };
      data.forEach(l => res += `- **${l.reactivo}** (Lote ${l.lote}): Venció el ${new Date(l.fechaVencimiento).toLocaleDateString()} pero sigue activo con ${l.cantidadRestante} unidades.\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('perdida economica') && cleanPrompt.includes('vencer')) {
      const data = await inventoryTools.checkExpiringFinancialLoss({ daysUntilExpiration: 60 });
      let res = `### 💸 Pérdida Económica por Próximos Vencimientos\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      res += `La pérdida financiera proyectada si no se utilizan los lotes que vencen pronto es de **$${data.perdidaTotalProyectada}**.\n\n`;
      data.lotesAfectados.forEach(l => res += `- ${l.reactivo} (Lote ${l.lote}): Pérdida de $${l.perdidaEconomicaEstimada}\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('motivo') && cleanPrompt.includes('merma')) {
      const data = await inventoryTools.checkShrinkageCauses({ days: 90 });
      let res = `### 🗑️ Análisis de Motivos de Mermas (Últimos 90 días)\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      for (const [motivo, qty] of Object.entries(data.desgloseMermas)) {
        res += `- **${motivo}**: ${qty} unidades perdidas.\n`;
      }
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('volumen teorico') && cleanPrompt.includes('real') && cleanPrompt.includes('discrepancia')) {
      const data = await inventoryTools.checkDiscrepancies();
      let res = `### ⚖️ Discrepancias: Volumen Teórico vs Real\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      if (data.length === 0) return { respuesta: res + `✅ No se encontraron discrepancias entre el volumen teórico y real.`, fuente: 'Controlab Brain' };
      data.forEach(d => res += `- **${d.reactivo}** (Lote ${d.lote}): Faltan ${d.diferenciaMermas} ${d.unidadMedida} (Teórico: ${d.volumenTeoricoRestante}, Real: ${d.volumenRealFisico})\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    // ---------------------------------------------------------
    // MÓDULO 3: COMPRAS Y PROVEEDORES
    // ---------------------------------------------------------
    if (cleanPrompt.includes('compra') && (cleanPrompt.includes('reciente') || cleanPrompt.includes('hoy') || cleanPrompt.includes('ultima') || cleanPrompt.includes('última'))) {
      const data = await inventoryTools.checkRecentPurchases({ limit: 5 });
      let res = `### 🛍️ Historial de Compras Recientes\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      if (data.length === 0) return { respuesta: res + `✅ No hay compras registradas.`, fuente: 'Controlab Brain' };
      data.forEach(c => {
        const fechaStr = new Date(c.fechaCompra).toISOString().split('T')[0];
        res += `- **${fechaStr}**: Compra de ${c.cantidad} uds de **${c.item}** a ${c.proveedor} (Total: $${c.total})\n`;
      });
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('compra') && cleanPrompt.includes('pendiente')) {
      const data = await inventoryTools.checkPendingPurchases();
      let res = `### ⏱️ Compras en Estado Pendiente\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      if (data.length === 0) return { respuesta: res + `✅ Todas las compras han sido recibidas.`, fuente: 'Controlab Brain' };
      data.forEach(c => res += `- Factura ${c.numeroFactura} de ${c.proveedor}: ${c.item} (Lleva ${c.diasEsperando} días esperando)\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('proveedor') && cleanPrompt.includes('retraso')) {
      const data = await inventoryTools.checkSupplierPerformance();
      let res = `### 🚚 Desempeño de Proveedores (Retrasos)\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      data.forEach(p => res += `- **${p.proveedor}**: Promedio de retraso de ${p.promedioDiasRetrasoEntrega} días (Gasto histórico: $${p.gastoTotalHistorico})\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('inflacion') || cleanPrompt.includes('variacion de precio')) {
      const data = await inventoryTools.checkPriceVariation({});
      let res = `### 📈 Análisis de Inflación y Variación de Precios\n\n`;
      if (data.error || data.mensaje) return { respuesta: res + (data.error || data.mensaje), fuente: 'Controlab Brain' };
      data.forEach(v => res += `- **${v.item}**: Subió de $${v.precioInicial} a $${v.precioActual} (Variación del ${v.porcentajeVariacion})\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    // ---------------------------------------------------------
    // MÓDULO 4: RITMO DE CONSUMO
    // ---------------------------------------------------------
    if (cleanPrompt.includes('rapido se agotan') || cleanPrompt.includes('top')) {
      const data = await inventoryTools.getTopConsumptions({ days: 30, limit: 5 });
      let res = `### 🔥 Top 5 Ítems de Mayor Consumo\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      data.forEach(c => res += `- **${c.item}**: Consumió ${c.cantidadConsumida} unidades en los últimos ${c.diasAnalizados} días.\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('ritmo de consumo') || cleanPrompt.includes('autonomia')) {
      const data = await inventoryTools.checkConsumptionRate({ days: 30 });
      let res = `### 🔋 Ritmo de Consumo y Autonomía\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      data.slice(0, 10).forEach(c => res += `- **${c.item}**: Consumo de ${c.consumoDiarioPromedio} ${c.unidad}/día. Autonomía: ${c.diasAutonomiaProyectados} días.\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    // ---------------------------------------------------------
    // MÓDULO 5: COSTOS Y RENTABILIDAD
    // ---------------------------------------------------------
    if (cleanPrompt.includes('gasto') && cleanPrompt.includes('fijo')) {
      const data = await costTools.calculateGlobalExpenses({});
      let res = `### 💰 Historial de Gastos Fijos y Globales\n\n`;
      if (data.error || data.mensaje) return { respuesta: res + (data.error || data.mensaje), fuente: 'Controlab Brain' };
      res += `- **Mes Evaluado:** ${data.mes} ${data.anio}\n`;
      res += `- **Gasto Operativo Total:** $${data.totalGastosOperativosFijos}\n`;
      res += `- **Administración:** ${data.porcentajeAdministrativos} | **Nómina:** ${data.porcentajePersonal}\n`;
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('margen') && cleanPrompt.includes('ganancia')) {
      const data = await costTools.calculateTestMargins({});
      let res = `### 💵 Márgenes de Ganancia y Costos por Prueba\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      data.slice(0, 7).forEach(m => res += `- **${m.prueba}**: Costo Real $${m.costoRealPorPrueba} | Venta $${m.precioVenta} | **Margen: ${m.margenRentabilidad}**\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('punto de equilibrio')) {
      const data = await costTools.calculateBreakEvenPoint();
      let res = `### ⚖️ Análisis de Punto de Equilibrio\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      res += `Para cubrir los costos fijos mensuales de **$${data.gastosFijosMensuales}**, con una ganancia promedio de **$${data.gananciaNetaPromedioPorPrueba}** por prueba, se requieren:\n\n`;
      res += `- **${data.puntoDeEquilibrioPruebasAlMes} pruebas al mes**\n`;
      res += `- **${data.puntoDeEquilibrioPruebasAlDia} pruebas diarias**\n`;
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('perdida financiera') && cleanPrompt.includes('desperdicio')) {
      const data = await costTools.calculateWasteCost();
      let res = `### 🗑️ Pérdida Financiera por Desperdicios\n\n`;
      if (data.error) return { respuesta: res + data.error, fuente: 'Controlab Brain' };
      res += `La pérdida semanal total estimada por mermas/desperdicios es de **$${data.perdidaSemanalTotalPorMermas}**.\n\n#### Top Pruebas con Mayor Pérdida:\n`;
      data.topPruebasConMayorPerdida.forEach(p => res += `- ${p.prueba}: Pierde $${p.perdidaSemanalEstimada}/semana (${p.porcentajeMermaConfigurado})\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('simula') && cleanPrompt.includes('tubo')) {
      const data = await costTools.simulatePriceImpact({ consumibleName: "tubo", percentageIncrease: 10 });
      let res = `### 🔮 Simulación de Impacto de Precios\n\n`;
      if (data.error || data.mensaje) return { respuesta: res + (data.error || data.mensaje), fuente: 'Controlab Brain' };
      res += `Si el proveedor sube el precio de **${data.consumible}** un **${data.incrementoSimulado}** (De $${data.costoUnitarioActual} a $${data.nuevoCostoSimulado}):\n\n`;
      data.impactoEnPruebas.forEach(i => res += `- La prueba **${i.pruebaAfectada}** aumentará su costo en $${i.costoAdicionalPorPrueba}\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('mantenimiento') && cleanPrompt.includes('equipo')) {
      const data = await costTools.compareEquipmentCosts();
      let res = `### 🔬 Costos de Mantenimiento por Equipos\n\n`;
      if (data.error || data.mensaje) return { respuesta: res + (data.error || data.mensaje), fuente: 'Controlab Brain' };
      data.forEach(e => res += `- **${e.equipo}**: Gasto mensual $${e.costoTotalMantenimiento} (Aporta $${e.costoDeMantenimientoPorPruebaAportado} al costo de cada prueba)\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    if (cleanPrompt.includes('reactivo muy costoso') && cleanPrompt.includes('bajo margen')) {
      const data = await costTools.checkExpensiveLowVolumeReagents();
      let res = `### ⚠️ Alerta: Reactivos Costosos en Pruebas Poco Rentables\n\n`;
      if (data.error || data.mensaje) return { respuesta: res + (data.error || data.mensaje), fuente: 'Controlab Brain' };
      data.forEach(r => res += `- **${r.prueba}**: El reactivo cuesta $${r.costoReactivoPorPrueba} y deja un margen de solo **${r.margenRentabilidad}**. ${r.alerta}\n`);
      return { respuesta: res, fuente: 'Controlab Brain' };
    }

    // ---------------------------------------------------------
    // DEFAULT
    // ---------------------------------------------------------
    return null; // Si no coincide con nada, retorna null para que caiga en el default del servicio principal

  } catch (error) {
    console.error("Error en offline handler:", error);
    return { respuesta: `Error procesando la solicitud offline: ${error.message}`, fuente: 'Controlab Brain' };
  }
}

module.exports = { handleOfflinePrompt };
