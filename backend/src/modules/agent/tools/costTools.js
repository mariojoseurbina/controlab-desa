const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Preguntas 31, 33, 34, 38: Costos reales por prueba y márgenes de ganancia
 */
async function calculateTestMargins({ testName = null }) {
  try {
    const configs = await prisma.costoPruebaConfig.findMany({
      include: {
        prueba: true,
        equipo: true,
        consumibles: { include: { item: true } }
      }
    });

    const resultados = [];

    for (const conf of configs) {
      if (testName && !conf.prueba?.nombre_prueba.toLowerCase().includes(testName.toLowerCase())) {
        continue;
      }

      let costoConsumibles = 0;
      if (conf.consumibles) {
        conf.consumibles.forEach(c => {
          const costoUnitario = Number(c.item?.precio_costo) || 0;
          costoConsumibles += (Number(c.cantidad) || 0) * costoUnitario;
        });
      }

      let costoReactivo = 0;
      if (conf.reactivo_id && conf.pruebas_por_kit > 0) {
        const reactivoItem = await prisma.itemInventario.findUnique({ where: { id: conf.reactivo_id } });
        if (reactivoItem) {
          costoReactivo = (Number(reactivoItem.precio_costo) || 0) / conf.pruebas_por_kit;
        }
      }

      let costoEquipo = 0;
      if (conf.equipo && conf.equipo.total_pruebas_equipo > 0) {
        const totalGastosEq = Number(conf.equipo.gasto_soluciones) + Number(conf.equipo.gasto_calibradores) + Number(conf.equipo.gasto_controles);
        costoEquipo = totalGastosEq / conf.equipo.total_pruebas_equipo;
      }

      const costoBase = costoConsumibles + costoReactivo + costoEquipo;
      const costoDesperdicio = costoBase * ((Number(conf.desperdicio_pct) || 0) / 100);
      const costoRealTotal = costoBase + costoDesperdicio;

      const precioVenta = Number(conf.precio_venta) || 0;
      const gananciaNeta = precioVenta - costoRealTotal;
      const margenPorcentaje = precioVenta > 0 ? (gananciaNeta / precioVenta) * 100 : 0;

      resultados.push({
        prueba: conf.prueba?.nombre_prueba || `Prueba ID ${conf.prueba_id}`,
        precioVenta: parseFloat(precioVenta.toFixed(2)),
        costoRealPorPrueba: parseFloat(costoRealTotal.toFixed(2)),
        desgloseCosto: {
          consumibles: parseFloat(costoConsumibles.toFixed(2)),
          reactivo: parseFloat(costoReactivo.toFixed(2)),
          mantenimientoEquipo: parseFloat(costoEquipo.toFixed(2)),
          desperdicioEstimado: parseFloat(costoDesperdicio.toFixed(2))
        },
        gananciaNeta: parseFloat(gananciaNeta.toFixed(2)),
        margenRentabilidad: parseFloat(margenPorcentaje.toFixed(2)) + '%'
      });
    }

    // Ordenar de mayor a menor rentabilidad
    return resultados.sort((a, b) => b.gananciaNeta - a.gananciaNeta);
  } catch (error) {
    console.error("Error en calculateTestMargins:", error);
    return { error: error.message };
  }
}

/**
 * Pregunta 32: Porcentajes de gastos globales administrativos vs personal
 */
async function calculateGlobalExpenses() {
  try {
    const gastos = await prisma.gastoMensualGlobal.findMany({
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      take: 1
    });

    if (gastos.length === 0) return { mensaje: "No hay configuración de gastos mensuales globales en la base de datos." };

    const g = gastos[0];
    const admin = Number(g.gastos_administrativos) || 0;
    const personal = Number(g.gastos_personal) || 0;
    const total = admin + personal;

    return {
      mes: g.mes,
      anio: g.anio,
      totalGastosOperativosFijos: parseFloat(total.toFixed(2)),
      porcentajeAdministrativos: total > 0 ? parseFloat(((admin / total) * 100).toFixed(2)) + '%' : '0%',
      porcentajePersonal: total > 0 ? parseFloat(((personal / total) * 100).toFixed(2)) + '%' : '0%'
    };
  } catch (error) {
    console.error("Error en calculateGlobalExpenses:", error);
    return { error: error.message };
  }
}

/**
 * Pregunta 35: Simular impacto de inflación de un proveedor o consumible
 */
async function simulatePriceImpact({ consumibleName, percentageIncrease }) {
  try {
    const items = await prisma.itemInventario.findMany({
      where: { nombre: { contains: consumibleName } },
      take: 1
    });

    if (items.length === 0) return { error: `No se encontró el consumible '${consumibleName}' en el inventario.` };
    const item = items[0];
    const costoActual = Number(item.precio_costo) || 0;
    const nuevoCosto = costoActual * (1 + (percentageIncrease / 100));

    // Buscar pruebas que usan este consumible
    const consumiblesUso = await prisma.consumiblePrueba.findMany({
      where: { item_id: item.id },
      include: { costo_config: { include: { prueba: true } } }
    });

    if (consumiblesUso.length === 0) return { mensaje: `El ítem '${item.nombre}' no está configurado en ninguna prueba maestra.` };

    const impactoEnPruebas = consumiblesUso.map(uso => {
      const cantidad = Number(uso.cantidad) || 0;
      const costoExtraPorPrueba = cantidad * (nuevoCosto - costoActual);
      return {
        pruebaAfectada: uso.costo_config?.prueba?.nombre_prueba || 'Desconocida',
        costoAdicionalPorPrueba: parseFloat(costoExtraPorPrueba.toFixed(2))
      };
    });

    return {
      consumible: item.nombre,
      incrementoSimulado: percentageIncrease + '%',
      costoUnitarioActual: costoActual,
      nuevoCostoSimulado: parseFloat(nuevoCosto.toFixed(2)),
      impactoEnPruebas: impactoEnPruebas
    };
  } catch (error) {
    console.error("Error en simulatePriceImpact:", error);
    return { error: error.message };
  }
}

/**
 * Pregunta 36: Comparación de costos de mantenimiento de equipos
 */
async function compareEquipmentCosts() {
  try {
    const equipos = await prisma.costoEquipoSolucion.findMany();
    
    if (equipos.length === 0) return { mensaje: "No hay equipos configurados en el módulo de costos." };

    return equipos.map(e => {
      const sol = Number(e.gasto_soluciones) || 0;
      const cal = Number(e.gasto_calibradores) || 0;
      const ctrl = Number(e.gasto_controles) || 0;
      const total = sol + cal + ctrl;
      const pruebas = Number(e.total_pruebas_equipo) || 1;

      return {
        equipo: e.nombre_equipo,
        costoTotalMantenimiento: parseFloat(total.toFixed(2)),
        desglose: { soluciones: sol, calibradores: cal, controles: ctrl },
        costoDeMantenimientoPorPruebaAportado: parseFloat((total / pruebas).toFixed(4))
      };
    }).sort((a, b) => b.costoDeMantenimientoPorPruebaAportado - a.costoDeMantenimientoPorPruebaAportado);
  } catch (error) {
    console.error("Error en compareEquipmentCosts:", error);
    return { error: error.message };
  }
}

/**
 * Pregunta 37: Costo por mermas y desperdicios
 */
async function calculateWasteCost() {
  try {
    const configs = await prisma.costoPruebaConfig.findMany({
      include: { prueba: true }
    });

    // Simulamos volumen de pruebas basado en la tabla maestra global
    const global = await prisma.gastoMensualGlobal.findFirst({ orderBy: [{ anio: 'desc' }, { mes: 'desc' }] });
    const volumenMensual = global && global.total_pruebas_mes > 0 ? global.total_pruebas_mes : 1000;
    const volumenSemanal = volumenMensual / 4;

    let perdidaTotalSemanal = 0;
    const detalles = [];

    const pruebasPorTipo = volumenSemanal / (configs.length || 1);

    for (const conf of configs) {
      const precioVenta = Number(conf.precio_venta) || 0;
      const desperdicio = Number(conf.desperdicio_pct) || 0;
      
      const costoPerdido = (precioVenta * (desperdicio / 100)) * pruebasPorTipo;
      perdidaTotalSemanal += costoPerdido;

      detalles.push({
        prueba: conf.prueba?.nombre_prueba || 'Desconocida',
        porcentajeMermaConfigurado: desperdicio + '%',
        perdidaSemanalEstimada: parseFloat(costoPerdido.toFixed(2))
      });
    }

    return {
      perdidaSemanalTotalPorMermas: parseFloat(perdidaTotalSemanal.toFixed(2)),
      topPruebasConMayorPerdida: detalles.sort((a, b) => b.perdidaSemanalEstimada - a.perdidaSemanalEstimada).slice(0, 5)
    };
  } catch (error) {
    console.error("Error en calculateWasteCost:", error);
    return { error: error.message };
  }
}

/**
 * Pregunta 39: Punto de equilibrio
 */
async function calculateBreakEvenPoint() {
  try {
    const global = await prisma.gastoMensualGlobal.findFirst({ orderBy: [{ anio: 'desc' }, { mes: 'desc' }] });
    if (!global) return { error: "No hay configuración de gastos fijos globales." };

    const gastosFijos = Number(global.gastos_administrativos) + Number(global.gastos_personal);

    // Obtener margen promedio usando la otra función
    const margenes = await calculateTestMargins({});
    if (margenes.error || margenes.length === 0) return { error: "No hay configuración de pruebas para calcular márgenes." };

    let totalGananciaUnitaria = 0;
    margenes.forEach(m => totalGananciaUnitaria += m.gananciaNeta);
    const gananciaPromedio = totalGananciaUnitaria / margenes.length;

    if (gananciaPromedio <= 0) return { error: "Las pruebas actuales están generando pérdidas en promedio. Punto de equilibrio inalcanzable." };

    const puntoEquilibrio = Math.ceil(gastosFijos / gananciaPromedio);

    return {
      gastosFijosMensuales: parseFloat(gastosFijos.toFixed(2)),
      gananciaNetaPromedioPorPrueba: parseFloat(gananciaPromedio.toFixed(2)),
      puntoDeEquilibrioPruebasAlMes: puntoEquilibrio,
      puntoDeEquilibrioPruebasAlDia: Math.ceil(puntoEquilibrio / 30)
    };
  } catch (error) {
    console.error("Error en calculateBreakEvenPoint:", error);
    return { error: error.message };
  }
}

/**
 * Pregunta 40: Reactivos costosos en pruebas de bajo volumen
 */
async function checkExpensiveLowVolumeReagents() {
  try {
    const margenes = await calculateTestMargins({});
    if (margenes.error || margenes.length === 0) return { mensaje: "No hay datos de márgenes." };

    // Aproximación lógica: reactivos cuyo costo represente más de $5 y la prueba tenga rentabilidad baja (< 20%)
    const costosos = margenes.filter(m => m.desgloseCosto.reactivo > 5 && parseFloat(m.margenRentabilidad) < 20).map(m => ({
      prueba: m.prueba,
      costoReactivoPorPrueba: m.desgloseCosto.reactivo,
      margenRentabilidad: m.margenRentabilidad,
      alerta: "Alto costo de reactivo en prueba de bajo margen. Recomendación: Evaluar alternativa o tercerizar."
    }));

    return costosos.length > 0 ? costosos : { mensaje: "No se detectaron reactivos críticamente costosos en pruebas no rentables." };
  } catch (error) {
    console.error("Error en checkExpensiveLowVolumeReagents:", error);
    return { error: error.message };
  }
}

module.exports = {
  calculateTestMargins,
  calculateGlobalExpenses,
  simulatePriceImpact,
  compareEquipmentCosts,
  calculateWasteCost,
  calculateBreakEvenPoint,
  checkExpensiveLowVolumeReagents
};
