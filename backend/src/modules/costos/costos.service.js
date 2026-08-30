const prisma = require('../../core/prisma');

class CostosService {
  // 1. Obtener todas las pruebas maestras con sus vínculos e ítems de inventario
  async getPruebas() {
    return await prisma.pruebas_maestra.findMany({
      include: {
        vinculos: {
          where: { activo: true },
          include: {
            item: true
          }
        }
      },
      orderBy: { nombre_prueba: 'asc' }
    });
  }

  // 2. Crear una nueva prueba genérica
  async createPrueba(data) {
    const { nombre_prueba } = data;
    if (!nombre_prueba || nombre_prueba.trim() === '') {
      throw new Error('El nombre de la prueba genérica es requerido.');
    }
    return await prisma.pruebas_maestra.create({
      data: {
        nombre_prueba: nombre_prueba.trim(),
        activo: true
      }
    });
  }

  // 3. Vincular un producto del inventario a una prueba genérica
  async createVinculo(data) {
    const { prueba_id, item_id } = data;
    if (!prueba_id || !item_id) {
      throw new Error('prueba_id e item_id son requeridos para crear el vínculo.');
    }

    const pid = parseInt(prueba_id);
    const iid = parseInt(item_id);

    // Verificar si ya existe un vínculo activo
    const existente = await prisma.vinculo_prueba_item.findFirst({
      where: {
        prueba_id: pid,
        item_id: iid,
        activo: true
      }
    });

    if (existente) {
      return existente;
    }

    return await prisma.vinculo_prueba_item.create({
      data: {
        prueba_id: pid,
        item_id: iid,
        activo: true
      }
    });
  }

  // 4. Eliminar/Desactivar un vínculo
  async deleteVinculo(id) {
    const vid = parseInt(id);
    return await prisma.vinculo_prueba_item.update({
      where: { id: vid },
      data: { activo: false }
    });
  }

  // 5. Análisis de costos agrupados por prueba genérica (sumar todas las marcas vinculadas)
  async getAnalisisCostos() {
    // Obtener pruebas con sus productos asociados
    const pruebas = await prisma.pruebas_maestra.findMany({
      where: { activo: true },
      include: {
        vinculos: {
          where: { activo: true },
          include: {
            item: true
          }
        }
      }
    });

    const analisis = [];

    for (const prueba of pruebas) {
      const itemIds = prueba.vinculos.map(v => v.item.id);

      // Si no tiene productos vinculados, el gasto es cero
      if (itemIds.length === 0) {
        analisis.push({
          id: prueba.id,
          nombre_prueba: prueba.nombre_prueba,
          items_vinculados: [],
          total_compras: 0,
          total_cantidad: 0,
          gastado_usd: 0,
          gastado_ves: 0,
          impuesto_usd: 0,
          impuesto_ves: 0,
          total_linea_usd: 0,
          total_linea_ves: 0
        });
        continue;
      }

      // Obtener todas las compras de estos ítems vinculados
      const compras = await prisma.compras_inventario.findMany({
        where: {
          item_id: { in: itemIds }
        }
      });

      // Calcular acumulados financieros con fallback para campos nulos/anteriores
      let totalCantidad = 0;
      let gastadoUsd = 0;
      let gastadoVes = 0;
      let impuestoUsd = 0;
      let impuestoVes = 0;
      let totalLineaUsd = 0;
      let totalLineaVes = 0;

      compras.forEach(compra => {
        const cant = compra.cantidad ? Number(compra.cantidad) : 0;
        totalCantidad += cant;

        const moneda = compra.moneda_factura || 'USD';
        const tasa = compra.tasa_cambio ? Number(compra.tasa_cambio) : 36.50; // Fallback rate
        const pctIva = compra.porcentaje_impuesto ? Number(compra.porcentaje_impuesto) : 0.0;

        let subUsd = 0;
        let subVes = 0;
        let taxUsd = 0;
        let taxVes = 0;
        let totUsd = 0;
        let totVes = 0;

        if (compra.subtotal_usd !== null && compra.subtotal_usd !== undefined) {
          subUsd = Number(compra.subtotal_usd);
          subVes = Number(compra.subtotal_ves);
          taxUsd = Number(compra.monto_impuesto_usd);
          taxVes = Number(compra.monto_impuesto_ves);
          totUsd = Number(compra.total_linea_usd);
          totVes = Number(compra.total_linea_ves);
        } else {
          // Reconstruir a partir de columnas tradicionales
          const pUnit = compra.precio_unitario ? Number(compra.precio_unitario) : 0;
          if (moneda === 'VES') {
            subVes = cant * pUnit;
            taxVes = subVes * (pctIva / 100);
            totVes = subVes + taxVes;

            subUsd = subVes / tasa;
            taxUsd = taxVes / tasa;
            totUsd = totVes / tasa;
          } else {
            subUsd = cant * pUnit;
            taxUsd = subUsd * (pctIva / 100);
            totUsd = subUsd + taxUsd;

            subVes = subUsd * tasa;
            taxVes = taxUsd * tasa;
            totVes = totUsd * tasa;
          }
        }

        gastadoUsd += subUsd;
        gastadoVes += subVes;
        impuestoUsd += taxUsd;
        impuestoVes += taxVes;
        totalLineaUsd += totUsd;
        totalLineaVes += totVes;
      });

      analisis.push({
        id: prueba.id,
        nombre_prueba: prueba.nombre_prueba,
        items_vinculados: prueba.vinculos.map(v => ({
          vinculo_id: v.id,
          item_id: v.item.id,
          codigo: v.item.codigo,
          nombre: v.item.nombre,
          naturaleza: v.item.naturaleza || 'No definida',
          area_operativa: v.item.area_operativa || 'No definida',
          stock_actual: v.item.stock_actual ? Number(v.item.stock_actual) : 0
        })),
        total_compras: compras.length,
        total_cantidad: totalCantidad,
        gastado_usd: Number(gastadoUsd.toFixed(2)),
        gastado_ves: Number(gastadoVes.toFixed(2)),
        impuesto_usd: Number(impuestoUsd.toFixed(2)),
        impuesto_ves: Number(impuestoVes.toFixed(2)),
        total_linea_usd: Number(totalLineaUsd.toFixed(2)),
        total_linea_ves: Number(totalLineaVes.toFixed(2))
      });
    }

    return analisis;
  }

  // 6. Impacto Fiscal e Impuestos agrupados por Área Operativa
  async getImpactoFiscal() {
    const items = await prisma.itemInventario.findMany();
    const itemsMap = {};
    items.forEach(item => {
      itemsMap[item.id] = item;
    });

    const compras = await prisma.compras_inventario.findMany();

    const resumenArea = {};

    compras.forEach(compra => {
      const item = itemsMap[compra.item_id] || {};
      const area = item.area_operativa || 'Sin Área Definida';

      if (!resumenArea[area]) {
        resumenArea[area] = {
          area_operativa: area,
          total_compras: 0,
          subtotal_usd: 0,
          subtotal_ves: 0,
          impuesto_usd: 0,
          impuesto_ves: 0,
          total_usd: 0,
          total_ves: 0
        };
      }

      const cant = compra.cantidad ? Number(compra.cantidad) : 0;
      const moneda = compra.moneda_factura || 'USD';
      const tasa = compra.tasa_cambio ? Number(compra.tasa_cambio) : 36.50;
      const pctIva = compra.porcentaje_impuesto ? Number(compra.porcentaje_impuesto) : 0.0;

      let subUsd = 0;
      let subVes = 0;
      let taxUsd = 0;
      let taxVes = 0;
      let totUsd = 0;
      let totVes = 0;

      if (compra.subtotal_usd !== null && compra.subtotal_usd !== undefined) {
        subUsd = Number(compra.subtotal_usd);
        subVes = Number(compra.subtotal_ves);
        taxUsd = Number(compra.monto_impuesto_usd);
        taxVes = Number(compra.monto_impuesto_ves);
        totUsd = Number(compra.total_linea_usd);
        totVes = Number(compra.total_linea_ves);
      } else {
        const pUnit = compra.precio_unitario ? Number(compra.precio_unitario) : 0;
        if (moneda === 'VES') {
          subVes = cant * pUnit;
          taxVes = subVes * (pctIva / 100);
          totVes = subVes + taxVes;

          subUsd = subVes / tasa;
          taxUsd = taxVes / tasa;
          totUsd = totVes / tasa;
        } else {
          subUsd = cant * pUnit;
          taxUsd = subUsd * (pctIva / 100);
          totUsd = subUsd + taxUsd;

          subVes = subUsd * tasa;
          taxVes = taxUsd * tasa;
          totVes = totUsd * tasa;
        }
      }

      resumenArea[area].total_compras += 1;
      resumenArea[area].subtotal_usd += subUsd;
      resumenArea[area].subtotal_ves += subVes;
      resumenArea[area].impuesto_usd += taxUsd;
      resumenArea[area].impuesto_ves += taxVes;
      resumenArea[area].total_usd += totUsd;
      resumenArea[area].total_ves += totVes;
    });

    // Formatear decimales
    return Object.values(resumenArea).map(row => ({
      ...row,
      subtotal_usd: Number(row.subtotal_usd.toFixed(2)),
      subtotal_ves: Number(row.subtotal_ves.toFixed(2)),
      impuesto_usd: Number(row.impuesto_usd.toFixed(2)),
      impuesto_ves: Number(row.impuesto_ves.toFixed(2)),
      total_usd: Number(row.total_usd.toFixed(2)),
      total_ves: Number(row.total_ves.toFixed(2))
    }));
  }

  // 7. Obtener gastos globales mensuales
  async getGastosGlobales() {
    const gastos = await prisma.gastoMensualGlobal.findMany({
      orderBy: [
        { anio: 'desc' },
        { mes: 'desc' }
      ]
    });
    const volumenes = await prisma.volumenAreaMensual.findMany();
    return gastos.map(g => {
      const vols = {};
      volumenes
        .filter(v => v.mes === g.mes && v.anio === g.anio)
        .forEach(v => {
          vols[v.area] = v.volumen;
        });
      return {
        ...g,
        gastos_administrativos: Number(g.gastos_administrativos),
        gastos_personal: Number(g.gastos_personal),
        volumenes_area: vols
      };
    });
  }

  // 8. Guardar/Actualizar gastos globales mensuales
  async saveGastosGlobales(data) {
    const { mes, anio, gastos_administrativos, gastos_personal, total_pruebas_mes, desglose_admin, volumenes_area } = data;
    if (!mes || !anio) {
      throw new Error('El mes y el año son obligatorios.');
    }

    const gMes = parseInt(mes);
    const gAnio = parseInt(anio);
    const admin = Number(gastos_administrativos || 0);
    const personal = Number(gastos_personal || 0);
    const pruebas = parseInt(total_pruebas_mes || 0);

    return await prisma.$transaction(async (tx) => {
      const result = await tx.gastoMensualGlobal.upsert({
        where: {
          mes_anio: {
            mes: gMes,
            anio: gAnio
          }
        },
        update: {
          gastos_administrativos: admin,
          gastos_personal: personal,
          total_pruebas_mes: pruebas,
          desglose_admin: desglose_admin || null
        },
        create: {
          mes: gMes,
          anio: gAnio,
          gastos_administrativos: admin,
          gastos_personal: personal,
          total_pruebas_mes: pruebas,
          desglose_admin: desglose_admin || null
        }
      });

      if (volumenes_area && typeof volumenes_area === 'object') {
        for (const [area, vol] of Object.entries(volumenes_area)) {
          const vNum = parseInt(vol);
          if (!isNaN(vNum) && vNum >= 0) {
            await tx.volumenAreaMensual.upsert({
              where: {
                mes_anio_area: {
                  mes: gMes,
                  anio: gAnio,
                  area: area
                }
              },
              update: {
                volumen: vNum
              },
              create: {
                mes: gMes,
                anio: gAnio,
                area: area,
                volumen: vNum
              }
            });
          }
        }
      }

      return {
        ...result,
        gastos_administrativos: Number(result.gastos_administrativos),
        gastos_personal: Number(result.gastos_personal)
      };
    });
  }

  // 9. Obtener costos por equipo
  async getCostosEquipos() {
    const equipos = await prisma.costoEquipoSolucion.findMany({
      orderBy: { nombre_equipo: 'asc' }
    });
    return equipos.map(eq => ({
      ...eq,
      gasto_soluciones: Number(eq.gasto_soluciones),
      gasto_calibradores: Number(eq.gasto_calibradores),
      gasto_controles: Number(eq.gasto_controles)
    }));
  }

  // 10. Guardar/Actualizar costo por equipo
  async saveCostoEquipo(data) {
    const { id, nombre_equipo, gasto_soluciones, gasto_calibradores, gasto_controles, total_pruebas_equipo } = data;
    if (!nombre_equipo || nombre_equipo.trim() === '') {
      throw new Error('El nombre del equipo es obligatorio.');
    }

    const eqNombre = nombre_equipo.trim();
    const sol = Number(gasto_soluciones || 0);
    const cal = Number(gasto_calibradores || 0);
    const ctrl = Number(gasto_controles || 0);
    const pruebas = parseInt(total_pruebas_equipo || 0);

    let result;
    if (id) {
      result = await prisma.costoEquipoSolucion.update({
        where: { id: parseInt(id) },
        data: {
          nombre_equipo: eqNombre,
          gasto_soluciones: sol,
          gasto_calibradores: cal,
          gasto_controles: ctrl,
          total_pruebas_equipo: pruebas
        }
      });
    } else {
      const existente = await prisma.costoEquipoSolucion.findFirst({
        where: { nombre_equipo: eqNombre }
      });

      if (existente) {
        result = await prisma.costoEquipoSolucion.update({
          where: { id: existente.id },
          data: {
            gasto_soluciones: sol,
            gasto_calibradores: cal,
            gasto_controles: ctrl,
            total_pruebas_equipo: pruebas
          }
        });
      } else {
        result = await prisma.costoEquipoSolucion.create({
          data: {
            nombre_equipo: eqNombre,
            gasto_soluciones: sol,
            gasto_calibradores: cal,
            gasto_controles: ctrl,
            total_pruebas_equipo: pruebas
          }
        });
      }
    }

    return {
      ...result,
      gasto_soluciones: Number(result.gasto_soluciones),
      gasto_calibradores: Number(result.gasto_calibradores),
      gasto_controles: Number(result.gasto_controles)
    };
  }

  // 11. Eliminar costo por equipo
  async deleteCostoEquipo(id) {
    if (!id) {
      throw new Error('El ID del equipo es obligatorio.');
    }
    return await prisma.costoEquipoSolucion.delete({
      where: { id: parseInt(id) }
    });
  }

  // 12. Guardar/Actualizar configuración de costo de una prueba
  async saveCostoPruebaConfig(data) {
    const {
      prueba_id,
      precio_venta,
      desperdicio_pct,
      pruebas_por_kit,
      reactivo_id,
      equipo_id,
      consumibles
    } = data;

    if (!prueba_id) {
      throw new Error('El ID de la prueba genérica es obligatorio.');
    }
    if (!reactivo_id) {
      throw new Error('El reactivo principal es obligatorio.');
    }
    if (!pruebas_por_kit || pruebas_por_kit <= 0) {
      throw new Error('La cantidad de pruebas por kit debe ser mayor a 0.');
    }

    const pid = parseInt(prueba_id);
    const rId = parseInt(reactivo_id);
    const eqId = equipo_id ? parseInt(equipo_id) : null;
    const pVenta = Number(precio_venta || 0);
    const despPct = Number(desperdicio_pct !== undefined ? desperdicio_pct : 5.00);
    const pKit = parseInt(pruebas_por_kit);

    return await prisma.$transaction(async (tx) => {
      const config = await tx.costoPruebaConfig.upsert({
        where: { prueba_id: pid },
        update: {
          precio_venta: pVenta,
          desperdicio_pct: despPct,
          pruebas_por_kit: pKit,
          reactivo_id: rId,
          equipo_id: eqId
        },
        create: {
          prueba_id: pid,
          precio_venta: pVenta,
          desperdicio_pct: despPct,
          pruebas_por_kit: pKit,
          reactivo_id: rId,
          equipo_id: eqId
        }
      });

      await tx.consumiblePrueba.deleteMany({
        where: { costo_config_id: config.id }
      });

      if (consumibles && Array.isArray(consumibles) && consumibles.length > 0) {
        const insertData = consumibles.map(c => ({
          costo_config_id: config.id,
          item_id: parseInt(c.item_id),
          cantidad: Number(c.cantidad || 0),
          fase: c.fase || 'TOMA_MUESTRA'
        }));

        await tx.consumiblePrueba.createMany({
          data: insertData
        });
      }

      return await tx.costoPruebaConfig.findUnique({
        where: { id: config.id },
        include: {
          consumibles: {
            include: {
              item: true
            }
          }
        }
      });
    });
  }

  // 13. Obtener configuración de costo de una prueba
  async getCostoPruebaConfig(pruebaId) {
    if (!pruebaId) {
      throw new Error('El ID de la prueba es obligatorio.');
    }
    const config = await prisma.costoPruebaConfig.findUnique({
      where: { prueba_id: parseInt(pruebaId) },
      include: {
        consumibles: {
          include: {
            item: true
          }
        },
        prueba: true,
        equipo: true
      }
    });

    if (!config) {
      return null;
    }

    return {
      ...config,
      precio_venta: Number(config.precio_venta),
      desperdicio_pct: Number(config.desperdicio_pct),
      consumibles: config.consumibles.map(c => ({
        ...c,
        cantidad: Number(c.cantidad),
        item: {
          ...c.item,
          precio_costo: c.item.precio_costo ? Number(c.item.precio_costo) : 0,
          precio_venta: c.item.precio_venta ? Number(c.item.precio_venta) : 0,
          stock_actual: c.item.stock_actual ? Number(c.item.stock_actual) : 0
        }
      }))
    };
  }

  // 14. Calcular Costo Unitario Completo
  async calcularCostoPrueba(pruebaId, mes, anio) {
    if (!pruebaId) {
      throw new Error('El ID de la prueba es obligatorio.');
    }

    const config = await prisma.costoPruebaConfig.findUnique({
      where: { prueba_id: parseInt(pruebaId) },
      include: {
        consumibles: {
          include: {
            item: true
          }
        },
        prueba: true,
        equipo: true
      }
    });

    if (!config) {
      return {
        configurado: false,
        message: 'Esta prueba no está configurada en la calculadora de costos.'
      };
    }

    // 1. Costo del Reactivo Principal
    const reactivo = await prisma.itemInventario.findUnique({
      where: { id: config.reactivo_id }
    });

    const precioReactivo = reactivo?.precio_costo ? Number(reactivo.precio_costo) : 0;
    const desperdicioFactor = 1 + (Number(config.desperdicio_pct) / 100);
    const costoReactivoUnitario = (precioReactivo / config.pruebas_por_kit) * desperdicioFactor;

    const detalleReactivo = {
      item_id: config.reactivo_id,
      nombre: reactivo?.nombre || 'Reactivo no encontrado',
      codigo: reactivo?.codigo || '',
      precio_costo: precioReactivo,
      pruebas_por_kit: config.pruebas_por_kit,
      desperdicio_pct: Number(config.desperdicio_pct),
      costo_unitario: Number(costoReactivoUnitario.toFixed(4))
    };

    // 2. Costo de Consumibles de Toma de Muestra (Pre-analítica)
    let costoTomaMuestra = 0;
    const consumiblesTomaMuestra = config.consumibles.filter(c => c.fase === 'TOMA_MUESTRA');
    const detalleTomaMuestra = consumiblesTomaMuestra.map(c => {
      const itemCost = c.item.precio_costo ? Number(c.item.precio_costo) : 0;
      const subtotal = Number(c.cantidad) * itemCost;
      costoTomaMuestra += subtotal;
      return {
        item_id: c.item_id,
        nombre: c.item.nombre,
        codigo: c.item.codigo,
        cantidad: Number(c.cantidad),
        precio_costo: itemCost,
        subtotal: Number(subtotal.toFixed(4))
      };
    });

    // 3. Costo de Consumibles de Procesamiento (Insumos Bioanalista)
    let costoProcesamientoInsumos = 0;
    const consumiblesProcesamiento = config.consumibles.filter(c => c.fase === 'PROCESAMIENTO');
    const detalleProcesamiento = consumiblesProcesamiento.map(c => {
      const itemCost = c.item.precio_costo ? Number(c.item.precio_costo) : 0;
      const subtotal = Number(c.cantidad) * itemCost;
      costoProcesamientoInsumos += subtotal;
      return {
        item_id: c.item_id,
        nombre: c.item.nombre,
        codigo: c.item.codigo,
        cantidad: Number(c.cantidad),
        precio_costo: itemCost,
        subtotal: Number(subtotal.toFixed(4))
      };
    });

    // 4. Costo de Procesamiento - Equipo (Soluciones, Calibradores, Controles)
    let costoEquipoSolucionUnitario = 0;
    let detalleEquipo = null;

    // Buscar si hay volumen de área registrado para este mes/año
    let volumenDeArea = null;
    const areaPrueba = reactivo?.area_operativa || 'Sin Área';
    if (mes && anio && reactivo?.area_operativa) {
      const volRec = await prisma.volumenAreaMensual.findUnique({
        where: {
          mes_anio_area: {
            mes: parseInt(mes),
            anio: parseInt(anio),
            area: reactivo.area_operativa
          }
        }
      });
      if (volRec) {
        volumenDeArea = volRec.volumen;
      }
    }

    if (config.equipo) {
      const eq = config.equipo;
      const soluciones = Number(eq.gasto_soluciones);
      const calibradores = Number(eq.gasto_calibradores);
      const controles = Number(eq.gasto_controles);
      
      // El divisor es el volumen del área si está configurado y > 0, si no, las pruebas del equipo
      const divisor = (volumenDeArea !== null && volumenDeArea > 0)
        ? volumenDeArea
        : (eq.total_pruebas_equipo || 1);

      costoEquipoSolucionUnitario = (soluciones + calibradores + controles) / divisor;
      detalleEquipo = {
        id: eq.id,
        nombre_equipo: eq.nombre_equipo,
        gasto_soluciones: soluciones,
        gasto_calibradores: calibradores,
        gasto_controles: controles,
        total_pruebas_equipo: eq.total_pruebas_equipo,
        volumen_area_usado: volumenDeArea,
        area_operativa: areaPrueba,
        costo_unitario: Number(costoEquipoSolucionUnitario.toFixed(4))
      };
    }

    // 5 y 6. Costo Administrativo y Mano de Obra (Personal)
    let gastoGlobal = null;
    if (mes && anio) {
      gastoGlobal = await prisma.gastoMensualGlobal.findUnique({
        where: {
          mes_anio: {
            mes: parseInt(mes),
            anio: parseInt(anio)
          }
        }
      });
    } else {
      gastoGlobal = await prisma.gastoMensualGlobal.findFirst({
        orderBy: [
          { anio: 'desc' },
          { mes: 'desc' }
        ]
      });
    }

    let costoAdministrativoUnitario = 0;
    let costoPersonalUnitario = 0;
    let detalleGastosGlobales = null;

    if (gastoGlobal) {
      const admin = Number(gastoGlobal.gastos_administrativos);
      const personal = Number(gastoGlobal.gastos_personal);
      const totalPruebas = gastoGlobal.total_pruebas_mes || 1;
      costoAdministrativoUnitario = admin / totalPruebas;
      costoPersonalUnitario = personal / totalPruebas;
      detalleGastosGlobales = {
        id: gastoGlobal.id,
        mes: gastoGlobal.mes,
        anio: gastoGlobal.anio,
        gastos_administrativos: admin,
        gastos_personal: personal,
        total_pruebas_mes: gastoGlobal.total_pruebas_mes,
        costo_admin_unitario: Number(costoAdministrativoUnitario.toFixed(4)),
        costo_personal_unitario: Number(costoPersonalUnitario.toFixed(4))
      };
    }

    // Costo Total Unitario
    const costoTotalUnitario = 
      costoReactivoUnitario + 
      costoTomaMuestra + 
      costoProcesamientoInsumos + 
      costoEquipoSolucionUnitario + 
      costoAdministrativoUnitario + 
      costoPersonalUnitario;

    const precioVenta = Number(config.precio_venta);
    const margenGananciaPct = precioVenta > 0 
      ? ((precioVenta - costoTotalUnitario) / precioVenta) * 100 
      : 0;

    let indicadorSemaforo = 'ROJO';
    if (margenGananciaPct > 50) {
      indicadorSemaforo = 'VERDE';
    } else if (margenGananciaPct >= 20) {
      indicadorSemaforo = 'AMARILLO';
    }

    return {
      configurado: true,
      prueba_id: config.prueba_id,
      nombre_prueba: config.prueba.nombre_prueba,
      precio_venta: precioVenta,
      costo_total_unitario: Number(costoTotalUnitario.toFixed(4)),
      margen_ganancia_pct: Number(margenGananciaPct.toFixed(2)),
      indicador_semaforo: indicadorSemaforo,
      desglose: {
        reactivo: detalleReactivo,
        toma_muestra: {
          consumibles: detalleTomaMuestra,
          total: Number(costoTomaMuestra.toFixed(4))
        },
        procesamiento_insumos: {
          consumibles: detalleProcesamiento,
          total: Number(costoProcesamientoInsumos.toFixed(4))
        },
        equipo: detalleEquipo,
        gastos_globales: detalleGastosGlobales
      }
    };
  }
}

module.exports = new CostosService();
