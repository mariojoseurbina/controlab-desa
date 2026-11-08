const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// REGLA DE NEGOCIO PERMANENTE: NORMALIZACIÓN UNIVERSAL A MAYÚSCULAS Y LIMPIEZA DE CARACTERES
const normalizarTextoMayusculas = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/Ã¡/g, 'Á')
    .replace(/Ã©/g, 'É')
    .replace(/Ã­/g, 'Í')
    .replace(/Ã³/g, 'Ó')
    .replace(/Ãº/g, 'Ú')
    .replace(/Ã±/g, 'Ñ')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/Â/g, '')
    .trim()
    .toUpperCase();
};

class CajasService {
  /**
   * Obtener todas las cajas en el laboratorio categorizadas por estado:
   * 1. Cajas Cerradas (En nevera/estante del laboratorio, esperando ser abiertas por el bioanalista)
   * 2. Cajas Abiertas / En Uso en Analizadores (con frasco montado y conteo en vivo)
   * 3. Cajas Agotadas / Historial
   */
  async getCajasLaboratorio() {
    // Buscar todos los lotes con sus datos de inventario
    const lotes = await prisma.lotesReactivos.findMany({
      where: {
        estado_transferencia: { in: ['RECIBIDO_LABORATORIO', 'LABORATORIO'] }
      },
      include: {
        items_inventario: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            marca: true,
            equipo_asociado: true,
            presentacion: true,
            frascos_por_caja: true,
            volumen_por_frasco: true,
            pruebas_teoricas_frasco: true,
            pruebas_teoricas_caja: true,
            consumo_indicado: true,
            codigo_barra: true
          }
        }
      },
      orderBy: { Id: 'desc' }
    });

    // 1. Conteo total histÃ³rico y conteo de hoy desde el sniffer
    const allSnifferLogs = await prisma.logSniffer.findMany({
      where: { lote_afectado_id: { not: null } },
      select: {
        lote_afectado_id: true,
        test_name: true,
        ml_descontados: true,
        fecha_registro: true,
        is_qc: true,
        is_calibracion: true,
        is_repeticion: true
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const consumoTotalPorLote = {};
    const consumoHoyPorLote = {};

    for (const log of allSnifferLogs) {
      const lId = log.lote_afectado_id;
      const ml = Number(log.ml_descontados) || 0;
      const isQc = Boolean(log.is_qc);
      const isCal = Boolean(log.is_calibracion);
      const isRep = Boolean(log.is_repeticion);

      if (!consumoTotalPorLote[lId]) {
        consumoTotalPorLote[lId] = {
          count: 0, ml: 0,
          paciente: 0, pacienteMl: 0,
          qc: 0, qcMl: 0,
          calibracion: 0, calibracionMl: 0,
          repeticion: 0, repeticionMl: 0
        };
      }
      const tot = consumoTotalPorLote[lId];
      tot.count += 1;
      tot.ml += ml;
      if (isQc) {
        tot.qc += 1;
        tot.qcMl += ml;
      } else if (isCal) {
        tot.calibracion += 1;
        tot.calibracionMl += ml;
      } else if (isRep) {
        tot.repeticion += 1;
        tot.repeticionMl += ml;
      } else {
        tot.paciente += 1;
        tot.pacienteMl += ml;
      }

      if (log.fecha_registro && new Date(log.fecha_registro) >= today) {
        if (!consumoHoyPorLote[lId]) {
          consumoHoyPorLote[lId] = {
            count: 0, ml: 0,
            paciente: 0, pacienteMl: 0,
            qc: 0, qcMl: 0,
            calibracion: 0, calibracionMl: 0,
            repeticion: 0, repeticionMl: 0
          };
        }
        const hoy = consumoHoyPorLote[lId];
        hoy.count += 1;
        hoy.ml += ml;
        if (isQc) {
          hoy.qc += 1;
          hoy.qcMl += ml;
        } else if (isCal) {
          hoy.calibracion += 1;
          hoy.calibracionMl += ml;
        } else if (isRep) {
          hoy.repeticion += 1;
          hoy.repeticionMl += ml;
        } else {
          hoy.paciente += 1;
          hoy.pacienteMl += ml;
        }
      }
    }

    const cajasCerradas = [];
    const cajasEnUso = [];
    const cajasAgotadas = [];

    for (const lote of lotes) {
      let meta = {};
      try {
        if (lote.CondicionesEspeciales && lote.CondicionesEspeciales.startsWith('{')) {
          meta = JSON.parse(lote.CondicionesEspeciales);
        }
      } catch (_) {}

            // REGLA MAESTRA: La Ficha de Producto (items_inventario) es la fuente de verdad primaria
      const itemFicha = lote.items_inventario;
      const totalFrascos = Number(itemFicha?.frascos_por_caja || meta.total_frascos) || 1;
      const volPorFrasco = Number(itemFicha?.volumen_por_frasco || meta.vol_por_frasco) || (totalFrascos > 0 && Number(itemFicha?.volumen_total_caja) ? (Number(itemFicha.volumen_total_caja) / totalFrascos) : 45);
      const consumoPorPrueba = Number(itemFicha?.consumo_indicado || meta.consumo_indicado) || 0.25;
      const pruebasPorFrasco = Number(itemFicha?.pruebas_teoricas_frasco || meta.pruebas_por_frasco) || (volPorFrasco > 0 ? Math.floor(volPorFrasco / consumoPorPrueba) : 180);
      const pruebasPorCaja = Number(itemFicha?.pruebas_teoricas_caja || meta.pruebas_por_caja) || (pruebasPorFrasco * totalFrascos);
      const totalVolCaja = Number(itemFicha?.volumen_total_caja || (totalFrascos * volPorFrasco));

      const statsTotal = consumoTotalPorLote[lote.Id] || { count: 0, ml: 0 };
      const statsHoy = consumoHoyPorLote[lote.Id] || { count: 0, ml: 0 };

      const pruebasConsumidasLoteTotal = statsTotal.count;
      const mlConsumidosLoteTotal = statsTotal.ml;

      // 🔄 AUTO-TRANSICIÓN AUTOMÁTICA DE FRASCOS (Sin necesidad de clic manual):
      // Si el volumen total acumulado consumido supera la capacidad de los frascos anteriores, avanza automáticamente
      const frascoCalculadoPorConsumo = Math.min(totalFrascos, Math.floor(mlConsumidosLoteTotal / (volPorFrasco || 1)) + 1);
      let frascoActual = Math.min(totalFrascos, Math.max(1, Math.max(Number(meta.frasco_actual) || 1, frascoCalculadoPorConsumo)));

      // Si el frasco actual cambia de forma automatica por el consumo del Sniffer, persistir en metadata
      if (frascoActual !== meta.frasco_actual && frascoActual <= totalFrascos) {
        meta.frasco_actual = frascoActual;
        meta[`fecha_apertura_frasco_${frascoActual}`] = meta[`fecha_apertura_frasco_${frascoActual}`] || new Date().toISOString();
        prisma.lotesReactivos.update({
          where: { Id: lote.Id },
          data: { CondicionesEspeciales: JSON.stringify(meta) }
        }).catch(() => {});
      }

      const eqItem = (itemFicha?.equipo_asociado || '').toUpperCase();
      const nomItem = (itemFicha?.nombre || '').toUpperCase();
      let equipoAsociado = 'CM 260i';

      if (eqItem.includes('5380') || eqItem.includes('BC') || nomItem.includes('M-53') || nomItem.includes('LEO')) {
        equipoAsociado = 'Mindray BC 5380';
      } else if (eqItem.includes('900') || eqItem.includes('CLIA') || nomItem.includes('(CLIA)') || nomItem.includes('CLIA')) {
        equipoAsociado = 'Mindray CL-900i';
      } else if (eqItem.includes('230') || (eqItem.includes('MINDRAY') && !eqItem.includes('900') && !eqItem.includes('5380'))) {
        equipoAsociado = 'Mindray BS-230';
      } else if (eqItem.includes('260') || eqItem.includes('WIENER')) {
        equipoAsociado = 'CM 260i';
      } else if ((itemFicha?.marca || '').toUpperCase().includes('MINDRAY')) {
        equipoAsociado = nomItem.includes('CLIA') ? 'Mindray CL-900i' : 'Mindray BS-230';
      }

      // Descuento exacto por frasco en uso a traves de los días:
      const mlRestantesCaja = Number(Math.max(0, Math.min(totalVolCaja, totalVolCaja - mlConsumidosLoteTotal)).toFixed(2));
      const pruebasRestantesCaja = Math.floor(mlRestantesCaja / consumoPorPrueba);

      const mlConsumidosEnFrascosPrevios = (frascoActual - 1) * volPorFrasco;
      const mlConsumidosEnFrascoActual = Math.max(0, mlConsumidosLoteTotal - mlConsumidosEnFrascosPrevios);
      const mlRestantesFrasco = Number(Math.min(volPorFrasco, volPorFrasco - mlConsumidosEnFrascoActual).toFixed(2));
      const pruebasRestantesFrasco = Math.floor(mlRestantesFrasco / consumoPorPrueba);
      const porcentajeRestante = volPorFrasco > 0 ? Math.min(100, Math.round((mlRestantesFrasco / volPorFrasco) * 100)) : 0;

      const esCajaAgotada = lote.Estado === 'Agotado'; // Solo se agota administrativamente

      // Detalle individual de cada frasco en la caja para la UI del monitor
      const frascos = [];
      for (let f = 1; f <= totalFrascos; f++) {
        if (f < frascoActual) {
          frascos.push({
            numero: f,
            estado: 'AGOTADO',
            mlRestantes: 0,
            volumenTotal: volPorFrasco,
            porcentaje: 0,
            esActual: false,
            color: '#ef4444' // Rojo
          });
        } else if (f === frascoActual) {
          const extra = mlRestantesFrasco <= 0;
          frascos.push({
            numero: f,
            estado: extra ? 'EXCEDENTE' : 'EN USO',
            mlRestantes: mlRestantesFrasco, // puede ser 0 o negativo
            volumenTotal: volPorFrasco,
            porcentaje: porcentajeRestante,
            esActual: true,
            color: extra ? '#8b5cf6' : (porcentajeRestante < 20 ? '#f59e0b' : '#10b981') // morado para excedente
          });
        } else {
          frascos.push({
            numero: f,
            estado: 'SELLADO',
            mlRestantes: volPorFrasco,
            volumenTotal: volPorFrasco,
            porcentaje: 100,
            esActual: false,
            color: '#64748b' // Pizarra sellado
          });
        }
      }

      const boxItem = {
        frascos,
        id: lote.Id,
        inventarioId: lote.InventarioId,
        productoNombre: lote.items_inventario?.nombre || 'Reactivo',
        productoCodigo: lote.items_inventario?.codigo || '',
        marca: lote.items_inventario?.marca || 'Wiener Lab',
        presentacion: lote.items_inventario?.presentacion || `${totalFrascos} frascos x ${volPorFrasco} ml`,
        numeroLote: lote.NumeroLote,
        fechaVencimiento: lote.FechaVencimiento,
        fechaApertura: meta.fecha_apertura_frasco_1 || lote.FechaApertura,
        usuarioApertura: lote.UsuarioApertura,
        totalFrascos,
        volPorFrasco,
        totalVolCaja,
        pruebasPorFrasco,
        pruebasPorCaja,
        frascoActual,
        equipoAsociado,
        estado: esCajaAgotada ? 'Agotado' : lote.Estado,
        cantidadActual: Number(lote.CantidadActual),
        cantidadInicial: Number(lote.CantidadInicial),
        // Conteo en vivo Sniffer
        pruebasConsumidasHoy: statsHoy.count,
        mlConsumidosHoy: statsHoy.ml,
        pruebasConsumidasTotal: pruebasConsumidasLoteTotal,
        mlConsumidosTotal: mlConsumidosLoteTotal,
        desgloseHoy: {
          paciente: { count: statsHoy.paciente || 0, ml: statsHoy.pacienteMl || 0 },
          qc: { count: statsHoy.qc || 0, ml: statsHoy.qcMl || 0 },
          calibracion: { count: statsHoy.calibracion || 0, ml: statsHoy.calibracionMl || 0 },
          repeticion: { count: statsHoy.repeticion || 0, ml: statsHoy.repeticionMl || 0 }
        },
        desgloseTotal: {
          paciente: { count: statsTotal.paciente || 0, ml: statsTotal.pacienteMl || 0 },
          qc: { count: statsTotal.qc || 0, ml: statsTotal.qcMl || 0 },
          calibracion: { count: statsTotal.calibracion || 0, ml: statsTotal.calibracionMl || 0 },
          repeticion: { count: statsTotal.repeticion || 0, ml: statsTotal.repeticionMl || 0 }
        },
        pruebasRestantesFrasco,
        pruebasRestantesCaja,
        mlRestantesFrasco,
        mlRestantesCaja,
        porcentajeRestante
      };

      if (esCajaAgotada) {
        cajasAgotadas.push(boxItem);
      } else if (lote.FechaApertura && (lote.Estado === 'Activo' || lote.Estado === 'En Uso')) {
        cajasEnUso.push(boxItem);
      } else {
        // Caja transferida al laboratorio pero que aÃºn no ha sido abierta por el bioanalista
        cajasCerradas.push(boxItem);
      }
    }

    return {
      cajasCerradas,
      cajasEnUso,
      cajasAgotadas,
      resumen: {
        totalCerradas: cajasCerradas.length,
        totalEnUso: cajasEnUso.length,
        totalAgotadas: cajasAgotadas.length
      }
    };
  }

  /**
   * Disparo de Apertura por el Bioanalista:
   * Cambia el estatus de la caja de Cerrada a ABIERTA / EN USO y monta el Frasco 1 en el CM 260i
   */
  async abrirCaja({ loteId, usuarioNombre, equipo }) {
    const lote = await prisma.lotesReactivos.findUnique({
      where: { Id: parseInt(loteId) },
      include: { items_inventario: true }
    });

        if (!lote) {
      throw new Error('Caja o lote no encontrado.');
    }

    // REGLA DE NEGOCIO ESTRICTA: SOLO SE PUEDEN ABRIR CAJAS EN ALMACEN LABORATORIO
    const transf = (lote.estado_transferencia || '').toUpperCase().trim();
    const almId = Number(lote.almacen_destino_id);
    const estaEnLaboratorio = transf === 'RECIBIDO_LABORATORIO' || transf === 'LABORATORIO' || almId === 2;

    if (!estaEnLaboratorio) {
      if (transf === 'EN_TRANSITO') {
        throw new Error('Acción bloqueada: Esta caja se encuentra EN TRÁNSITO hacia el Laboratorio. Primero debe ser aceptada y recibida en el Almacén de Laboratorio antes de que un Bioanalista pueda abrirla.');
      }
      throw new Error('Acción bloqueada: Esta caja se encuentra en el ALMACÉN CENTRAL. Es obligatorio realizar la transferencia y confirmación de recepción en el Almacén de Laboratorio antes de que un Bioanalista pueda abrirla.');
    }

    const eqItem = lote.items_inventario?.equipo_asociado;
    let defaultEquipo = 'CM 260i';
    if (eqItem) {
      defaultEquipo = eqItem;
    } else if ((lote.items_inventario?.marca || '').toLowerCase().includes('mindray')) {
      defaultEquipo = 'Mindray BS-230';
    }
    let equipoFinal = equipo || defaultEquipo;
    if (equipoFinal.toUpperCase().includes('CL-900') || equipoFinal.toUpperCase().includes('CL 900') || equipoFinal.toUpperCase().includes('CLIA')) {
      equipoFinal = 'Mindray CL-900i';
    } else if (equipoFinal.toUpperCase().includes('5380')) {
      equipoFinal = 'Mindray BC 5380';
    } else if (equipoFinal.toUpperCase().includes('BS-230') || equipoFinal.toUpperCase().includes('BS 230')) {
      equipoFinal = 'Mindray BS-230';
    } else if (equipoFinal.toUpperCase().includes('CM 260')) {
      equipoFinal = 'CM 260i';
    }
    const usuarioFinal = usuarioNombre || 'Sistema';

    // Regla estricta desde la Ficha de Producto:
    const totalFrascos = Number(lote.items_inventario?.frascos_por_caja) || 1;
    const volPorFrasco = Number(lote.items_inventario?.volumen_por_frasco) || (Number(lote.items_inventario?.volumen_total_caja) / totalFrascos) || 50;
    const volTotalCaja = Number(lote.items_inventario?.volumen_total_caja) || (totalFrascos * volPorFrasco);
    const consumoPorPrueba = Number(lote.items_inventario?.consumo_indicado) || 0.25;

    // Sumatoria de pruebas de todos los frascos de la caja completa
    const pruebasPorFrasco = Number(lote.items_inventario?.pruebas_teoricas_frasco) || Math.floor(volPorFrasco / consumoPorPrueba);
    const pruebasPorCaja = Number(lote.items_inventario?.pruebas_teoricas_caja) || (pruebasPorFrasco * totalFrascos);

    const metadata = {
      frasco_actual: 1,
      total_frascos: totalFrascos,
      vol_por_frasco: volPorFrasco,
      volumen_total_caja: volTotalCaja,
      consumo_indicado: consumoPorPrueba,
      pruebas_por_frasco: pruebasPorFrasco,
      pruebas_por_caja: pruebasPorCaja,
      equipo_asociado: equipoFinal,
      fecha_apertura_frasco_1: new Date().toISOString()
    };

   const updated = await prisma.$transaction(async (tx) => {
      // REGLA DE NEGOCIO OFICIAL CONTROLAB: EXCLUSIVIDAD DE CANAL POR ANALIZADOR Y SUSTITUCION DE CAJA
      // En el rotor/carrusel del analizador solo puede existir UN lote/caja activa por reactivo y equipo.
      // Al abrir una nueva caja (sea del mismo lote o un lote nuevo por sustitución),
      // las cajas previas activas de ese mismo reactivo y equipo se cierran automáticamente como 'Agotado',
      // registrando el movimiento de sustitución en Kárdex y preservando todo su historial físico y excedentes.
      const lotesPreviosActivos = await tx.lotesReactivos.findMany({
        where: {
          InventarioId: lote.InventarioId,
          Estado: 'Activo',
          FechaApertura: { not: null },
          Id: { not: lote.Id }
        }
      });

      for (const lotePrevio of lotesPreviosActivos) {
        let metaPrev = {};
        try { metaPrev = JSON.parse(lotePrevio.CondicionesEspeciales || '{}'); } catch (_) {}
        const eqPrevio = metaPrev.equipo_asociado || defaultEquipo;

        if (eqPrevio.toLowerCase().trim() === equipoFinal.toLowerCase().trim()) {
          await tx.lotesReactivos.update({
            where: { Id: lotePrevio.Id },
            data: { Estado: 'Agotado' }
          });

          await tx.movimientoInventario.create({
            data: {
              item_id: lotePrevio.InventarioId,
              tipo_movimiento: 'SUSTITUCION_LOTE',
              cantidad: 0,
              stock_anterior: Number(lotePrevio.CantidadActual || 0),
              stock_nuevo: 0,
              motivo: normalizarTextoMayusculas('CIERRE POR SUSTITUCION: APERTURA DE NUEVO LOTE ' + lote.NumeroLote + ' EN ' + equipoFinal),
              referencia: normalizarTextoMayusculas('LOTE ANTERIOR: ' + lotePrevio.NumeroLote + ' CERRADO POR ' + usuarioFinal),
              creado_por: 1
            }
          });
        }
      }

      // 1. Activar lote y registrar apertura de la caja con volumen total en mL y pruebas teÃ³ricas completas
      const loteActualizado = await tx.lotesReactivos.update({
        where: { Id: lote.Id },
        data: {
          Estado: 'Activo',
          estado_transferencia: 'RECIBIDO_LABORATORIO',
          almacen_destino_id: 2,
          CantidadActual: volTotalCaja,
          CantidadInicial: volTotalCaja,
          ConsumoPorPrueba: consumoPorPrueba,
          ReactivoPorPrueba: consumoPorPrueba,
          PruebasTeoricas: pruebasPorCaja,
          PruebasRestantes: pruebasPorCaja,
          FechaApertura: new Date(),
          UsuarioApertura: usuarioFinal,
          CondicionesEspeciales: JSON.stringify(metadata)
        }
      });

      // 2. REGLA DE NEGOCIO OBLIGATORIA: Debitar 1 caja fisica del Almacen de Laboratorio (almacen_id = 2)
      const stockLab = await tx.stockPorAlmacen.findFirst({
        where: { item_id: lote.InventarioId, almacen_id: 2 }
      });
      const stockLabAnterior = stockLab ? Number(stockLab.stock_actual) : 0;
      const stockLabNuevo = Math.max(0, stockLabAnterior - 1);
      if (stockLab) {
        await tx.stockPorAlmacen.update({
          where: { id: stockLab.id },
          data: { stock_actual: stockLabNuevo }
        });
      }

      // Actualizar el stock fÃ­sico de cajas cerradas en items_inventario
      const itemMaster = await tx.itemInventario.findUnique({
        where: { id: lote.InventarioId }
      });
      if (itemMaster && Number(itemMaster.stock_actual) > 0) {
        await tx.itemInventario.update({
          where: { id: lote.InventarioId },
          data: { stock_actual: Math.max(0, Number(itemMaster.stock_actual) - 1) }
        });
      }

      // 3. Asentar movimiento en el KÃ¡rdex con trazabilidad forense completa
      await tx.movimientoInventario.create({
        data: {
          item_id: lote.InventarioId,
          tipo_movimiento: 'APERTURA_CAJA',
          cantidad: 1,
          stock_anterior: stockLabAnterior,
          stock_nuevo: stockLabNuevo,
          motivo: normalizarTextoMayusculas(`APERTURA DE CAJA Y RETIRO DE ALMACEN LABORATORIO HACIA ${equipoFinal}`),
          referencia: normalizarTextoMayusculas(`LOTE: ${lote.NumeroLote} - PUESTA EN SERVICIO POR ${usuarioFinal}`),
          creado_por: 1,
          almacen_id: 2,
          almacen_destino_id: 2
        }
      });

      return loteActualizado;
    });

    return {
      success: true,
      message: `âœ… Caja del lote ${lote.NumeroLote} ABIERTA con exito por ${usuarioFinal}. Frasco 1 colocado en ${equipoFinal}.`,
      lote: updated
    };
  }

  /**
   * Apertura del Siguiente Frasco (Frasco 2, 3...):
   * Cuando el analizador agota el frasco previo y el bioanalista monta el siguiente frasco de la misma caja
   */
  async abrirSiguienteFrasco({ loteId, usuarioNombre }) {
    const lote = await prisma.lotesReactivos.findUnique({
      where: { Id: parseInt(loteId) },
      include: { items_inventario: true }
    });

    if (!lote) {
      throw new Error('Caja o lote no encontrado.');
    }

    let meta = {};
    try {
      if (lote.CondicionesEspeciales) meta = JSON.parse(lote.CondicionesEspeciales);
    } catch (_) {}

    const totalFrascos = Number(lote.items_inventario?.frascos_por_caja) || 4;
    const nuevoFrasco = (meta.frasco_actual || 1) + 1;

    if (nuevoFrasco > totalFrascos) {
      // Todos los frascos han sido consumidos, marcar caja como Agotada
      await prisma.lotesReactivos.update({
        where: { Id: lote.Id },
        data: { Estado: 'Agotado' }
      });
      return {
        success: true,
        cajaFinalizada: true,
        message: ` La caja del lote ${lote.NumeroLote} ha finalizado todos sus ${totalFrascos} frascos.`
      };
    }

    meta.frasco_actual = nuevoFrasco;
    meta[`fecha_apertura_frasco_${nuevoFrasco}`] = new Date().toISOString();

    const updated = await prisma.lotesReactivos.update({
      where: { Id: lote.Id },
      data: {
        CondicionesEspeciales: JSON.stringify(meta)
      }
    });

    return {
      success: true,
      cajaFinalizada: false,
      frascoActual: nuevoFrasco,
      totalFrascos,
      message: `âœ… Frasco ${nuevoFrasco} de ${totalFrascos} colocado en el analizador del lote ${lote.NumeroLote}.`,
      lote: updated
    };
  }

  /**
   * Parser Inteligente de Escaneo de CÃ³digos de Barras:
   * Recibe la lectura de la pistola lÃ¡ser (GS1-128 de caja o codigo de frasco)
   */
  
  async buscarCandidatosEscaneo({ barcode, equipo }) {
    const raw = String(barcode).trim();
    
    let gtin = null;
    let loteDetectado = null;

    if (raw.startsWith('01') && raw.length >= 16) {
      gtin = raw.substring(2, 16);
      const resto = raw.substring(16);
      if (resto.startsWith('10')) {
        loteDetectado = resto.substring(2);
      } else {
        loteDetectado = resto;
      }
    } else if (raw.includes('LDK') || raw.includes('LOT') || raw.length >= 6) {
      loteDetectado = raw;
    }

    const searchTerms = Array.from(new Set([raw, loteDetectado, gtin].filter(Boolean)));
    const orConditions = [];

    for (const term of searchTerms) {
      orConditions.push({ NumeroLote: { contains: term } });
      orConditions.push({ items_inventario: { codigo: { contains: term } } });
      orConditions.push({ items_inventario: { nombre: { contains: term } } });
      orConditions.push({ items_inventario: { referencia: { contains: term } } });
      orConditions.push({ items_inventario: { codigo_barra: { contains: term } } });
    }

    const candidatos = await prisma.lotesReactivos.findMany({
      where: {
        OR: orConditions,
        Estado: { not: 'Agotado' } 
      },
      include: { items_inventario: true },
      orderBy: [
        { FechaVencimiento: 'asc' }, 
        { Id: 'desc' }
      ]
    });

    // REGLA DE NEGOCIO OBLIGATORIA (Vigente a partir de 27/10/2026):
    // Consultar stock real por almacén para validar existencia física en laboratorio
    const itemIds = Array.from(new Set(candidatos.map(c => c.InventarioId).filter(Boolean)));
    const stockMap = new Map();
    if (itemIds.length > 0) {
      try {
        const stockRows = await prisma.$queryRawUnsafe(
          'SELECT item_id, almacen_id, stock_actual FROM stock_por_almacen WHERE item_id IN (' + itemIds.join(',') + ')'
        );
        stockRows.forEach(s => {
          if (!stockMap.has(s.item_id)) stockMap.set(s.item_id, { lab: 0, central: 0 });
          const cur = stockMap.get(s.item_id);
          if (s.almacen_id === 2) cur.lab = Number(s.stock_actual) || 0;
          if (s.almacen_id === 1) cur.central = Number(s.stock_actual) || 0;
        });
      } catch (stockErr) {
        console.error('[cajasService] Error consultando stock_por_almacen:', stockErr.message);
      }
    }

    // Filtrar candidatos según regla de negocio:
    // Si la caja ya fue abierta (FechaApertura != null o Estado == 'Activo' o 'Abierto')
    // y no queda stock en el almacén de laboratorio (stock_lab <= 0):
    // NO DEBE APARECER en la búsqueda de cajas para abrir/transferir para evitar confusión.
    const candidatosValidos = candidatos.filter(c => {
      const yaAbierta = c.FechaApertura !== null || c.Estado === 'Activo' || c.Estado === 'Abierto';
      const itemStock = stockMap.get(c.InventarioId) || { lab: 0, central: 0 };
      if (yaAbierta && itemStock.lab <= 0) {
        return false;
      }
      return true;
    });

    return {
      success: true,
      raw,
      candidatos: candidatosValidos.map(c => {
        const transf = (c.estado_transferencia || '').toUpperCase().trim();
        const almId = Number(c.almacen_destino_id);
        const itemStock = stockMap.get(c.InventarioId) || { lab: 0, central: 0 };
        const estaEnLab = transf === 'RECIBIDO_LABORATORIO' || transf === 'LABORATORIO' || almId === 2;
        const esTransito = transf === 'EN_TRANSITO';
        const esCerrada = !c.FechaApertura && (c.Estado === 'Cerrado' || c.Estado === 'CERRADO');
        
        let ubicacionTexto = 'Almacén Central';
        let ubicacionColor = '#ef4444';
        let puedeAbrir = false;
        let accionSugerida = 'Requiere Transferencia';

        if (estaEnLab) {
          ubicacionTexto = 'Almacén Laboratorio';
          ubicacionColor = '#10b981';
          // Solo puede abrirse si es una caja cerrada y hay stock físico en el almacén de laboratorio
          puedeAbrir = esCerrada && itemStock.lab > 0;
          accionSugerida = puedeAbrir ? 'Abrir Caja' : (c.FechaApertura ? 'Caja en Uso' : 'Sin Stock en Lab');
        } else if (esTransito) {
          ubicacionTexto = 'En Tránsito';
          ubicacionColor = '#f59e0b';
          puedeAbrir = false;
          accionSugerida = 'Recibir en Lab';
        }

        return {
          id: c.Id,
          lote: c.NumeroLote,
          producto: c.items_inventario?.nombre,
          marca: c.items_inventario?.marca,
          equipoAsociado: c.items_inventario?.equipo_asociado,
          fechaVencimiento: c.FechaVencimiento,
          estado: c.Estado,
          estadoTransferencia: c.estado_transferencia,
          almacenId: c.almacen_destino_id || 1,
          frascosCaja: c.items_inventario?.frascos_por_caja,
          fechaApertura: c.FechaApertura,
          estaEnLab,
          ubicacionTexto,
          ubicacionColor,
          puedeAbrir,
          accionSugerida
        };
      })
    };
  }

  async procesarLoteDirecto({ loteId, usuarioNombre, equipo }) {
    const lote = await prisma.lotesReactivos.findUnique({
      where: { Id: parseInt(loteId, 10) },
      include: { items_inventario: true }
    });

    if (!lote) throw new Error('Lote no encontrado.');

    if (lote.estado_transferencia === 'EN_TRANSITO') {
      await this.confirmarRecepcionElectronica({
        loteId: lote.Id,
        usuarioRecepcion: usuarioNombre || 'Sistema'
      });

      return {
        success: true,
        reconocido: true,
        accion: 'RECEPCION_CONFIRMADA',
        producto: lote.items_inventario?.nombre,
        lote: lote.NumeroLote,
        message: 'Recepcion Electronica Confirmada! Reactivo: ' + lote.items_inventario?.nombre + ' | Lote: ' + lote.NumeroLote + '. Caja ingresada a Reserva de Nevera.'
      };
    }

    const esCajaCerrada = !lote.FechaApertura || lote.Estado === 'Cerrado';
    if (esCajaCerrada) {
      const equipoDestino = equipo || ((lote.items_inventario?.marca || '').toLowerCase().includes('mindray') ? 'Mindray BS-230' : 'CM 260i');
      await this.abrirCaja({
        loteId: lote.Id,
        usuarioNombre: usuarioNombre || 'Sistema',
        equipo: equipoDestino
      });

      return {
        success: true,
        reconocido: true,
        accion: 'CAJA_ABIERTA',
        producto: lote.items_inventario?.nombre,
        lote: lote.NumeroLote,
        frascoActual: 1,
        totalFrascos: Number(lote.items_inventario?.frascos_por_caja) || 4,
        message: 'Caja Abierta por Validacion! Reactivo: ' + lote.items_inventario?.nombre + ' | Lote: ' + lote.NumeroLote + '. Frasco 1 colocado en ' + equipoDestino + '.'
      };
    } else {
      let meta = {};
      try { meta = JSON.parse(lote.CondicionesEspeciales || '{}'); } catch (e) {}
      const frascoAct = meta.frascoActual || 1;
      return {
        success: true,
        reconocido: true,
        accion: 'CAJA_YA_ACTIVA',
        producto: lote.items_inventario?.nombre,
        lote: lote.NumeroLote,
        frascoActual: frascoAct,
        totalFrascos: Number(lote.items_inventario?.frascos_por_caja) || 4,
        message: 'La caja Lote: ' + lote.NumeroLote + ' (' + lote.items_inventario?.nombre + ') ya se encuentra ACTIVA (Frasco ' + frascoAct + ').'
      };
    }
  }

  async procesarEscaneo({ barcode, usuarioNombre, equipo }) {

    const raw = String(barcode).trim();
    console.log('ðŸ” [CajasService] Procesando codigo escaneado o busqueda manual:', raw);

    let gtin = null;
    let loteDetectado = null;

    // A) Detectar estandar GS1-128 (ej: 017791778040338410LDK0527060)
    if (raw.startsWith('01') && raw.length >= 16) {
      gtin = raw.substring(2, 16); // 14 dÃ­gitos de GTIN
      const resto = raw.substring(16);
      if (resto.startsWith('10')) {
        loteDetectado = resto.substring(2); // Lo que sigue de (10) es el lote
      } else {
        loteDetectado = resto;
      }
    } else if (raw.includes('LDK') || raw.includes('LOT') || raw.length >= 6) {
      loteDetectado = raw;
    }

    // Colectar tÃ©rminos de bÃºsqueda para consulta multicriterio
    const searchTerms = Array.from(new Set([raw, loteDetectado, gtin].filter(Boolean)));
    const orConditions = [];

    for (const term of searchTerms) {
      orConditions.push({ NumeroLote: { contains: term } });
      orConditions.push({ items_inventario: { codigo: { contains: term } } });
      orConditions.push({ items_inventario: { nombre: { contains: term } } });
      orConditions.push({ items_inventario: { referencia: { contains: term } } });
      orConditions.push({ items_inventario: { codigo_barra: { contains: term } } });
    }

    // Buscar todos los lotes candidatos en base de datos
    const candidatos = await prisma.lotesReactivos.findMany({
      where: {
        OR: orConditions
      },
      include: { items_inventario: true },
      orderBy: [
        { FechaVencimiento: 'asc' },
        { Id: 'desc' }
      ]
    });

    if (!candidatos || candidatos.length === 0) {
      return {
        success: false,
        reconocido: false,
        raw,
        gtin,
        loteDetectado,
        message: `asi¸ Busqueda/Escaneo: "${raw}". No se encontra ningunn lote o reactivo registrado por Lote, CÃ³digo, Nombre o CÃ³digo de Barra.`
      };
    }

    // Priorizar seleccion segÃºn el ciclo operativo:
    // 1. Cajas en trasnsito hacia laboratorio (Pendiente por confirmar recepcion)
    // 2. Cajas cerradas en reserva/nevera (Pendiente por abrir para uso)
    // 3. Cajas activas en analizadores
    let lote = candidatos.find(c => c.estado_transferencia === 'EN_TRANSITO');
    if (!lote) {
      lote = candidatos.find(c => !c.FechaApertura || c.Estado === 'Cerrado');
    }
    if (!lote) {
      lote = candidatos[0];
    }

    // Si la caja estaba EN TRANSITO, confirmar su recepcion electronica a la nevera del laboratorio
    if (lote.estado_transferencia === 'EN_TRANSITO') {
      await this.confirmarRecepcionElectronica({
        loteId: lote.Id,
        usuarioRecepcion: usuarioNombre || 'Bioanalista (RecepciÃ³n)'
      });

      return {
        success: true,
        reconocido: true,
        accion: 'RECEPCION_CONFIRMADA',
        producto: lote.items_inventario?.nombre,
        lote: lote.NumeroLote,
        message: `Recepcion Electronica Confirmada! Reactivo: ${lote.items_inventario?.nombre} | Lote: ${lote.NumeroLote}. Caja ingresada a Reserva de Nevera.`
      };
    }

    // Si la caja estÃ¡ CERRADA en nevera, abrirla para el analizador
    const esCajaCerrada = !lote.FechaApertura || lote.Estado === 'Cerrado';
    if (esCajaCerrada) {
      const equipoDestino = equipo || ((lote.items_inventario?.marca || '').toLowerCase().includes('mindray') ? 'Mindray BS-230' : 'CM 260i');
      await this.abrirCaja({
        loteId: lote.Id,
        usuarioNombre: usuarioNombre || 'Bioanalista (Validacion)',
        equipo: equipoDestino
      });

      return {
        success: true,
        reconocido: true,
        accion: 'CAJA_ABIERTA',
        producto: lote.items_inventario?.nombre,
        lote: lote.NumeroLote,
        frascoActual: 1,
        totalFrascos: Number(lote.items_inventario?.frascos_por_caja) || 4,
        message: `¡Caja Abierta por Validacion! Reactivo: ${lote.items_inventario?.nombre} | Lote: ${lote.NumeroLote}. Frasco 1 colocado en ${equipoDestino}.`
      };
    } else {
      // La caja ya estaba abierta, confirmar su estado activo
      let meta = {};
      try { meta = JSON.parse(lote.CondicionesEspeciales || '{}'); } catch (_) {}
      return {
        success: true,
        reconocido: true,
        accion: 'CAJA_YA_ACTIVA',
        producto: lote.items_inventario?.nombre,
        lote: lote.NumeroLote,
        frascoActual: meta.frasco_actual || 1,
        totalFrascos: Number(lote.items_inventario?.frascos_por_caja) || 4,
        message: `â„¹ï¸ Caja ya en uso activo. Reactivo: ${lote.items_inventario?.nombre} | Lote: ${lote.NumeroLote} | Frasco actual: ${meta.frasco_actual || 1}.`
      };
    }
  }

  /**
   * Finalizar Caja y Activar AutomÃ¡ticamente la Siguiente Caja en Nevera:
   * 1. Marca la caja actual como Agotada.
   * 2. Busca la siguiente caja del mismo reactivo en la nevera (Almacen Laboratorio / Estado Cerrada).
   * 3. Si existe, la activa a 'Activo' con frasco 1 en uso.
   * 4. Registra el movimiento en KÃ¡rdex.
   */
  async finalizarCajaYActivarSiguiente({ loteId, usuarioNombre }) {
    const lote = await prisma.lotesReactivos.findUnique({
      where: { Id: parseInt(loteId) },
      include: { items_inventario: true }
    });

    if (!lote) {
      throw new Error('Caja o lote no encontrado.');
    }

    const usuario = usuarioNombre || 'Sistema';
    let meta = {};
    try {
      if (lote.CondicionesEspeciales) meta = JSON.parse(lote.CondicionesEspeciales);
    } catch (_) {}

    const equipoAsociado = meta.equipo_asociado || 'CM 260i';
    const totalFrascos = Number(lote.items_inventario?.frascos_por_caja) || 4;
    const volPorFrasco = Number(lote.items_inventario?.volumen_por_frasco) || 45;
    const volTotalCaja = totalFrascos * volPorFrasco;

    const result = await prisma.$transaction(async (tx) => {
      // A. Agotar la caja actual
      const loteAgotado = await tx.lotesReactivos.update({
        where: { Id: lote.Id },
        data: {
          Estado: 'Agotado',
          CantidadActual: 0
        }
      });

      // Registrar movimiento de caja agotada
      await tx.movimientoInventario.create({
        data: {
          item_id: lote.InventarioId,
          tipo_movimiento: 'CONSUMO',
          cantidad: 0,
          stock_anterior: Number(lote.CantidadActual),
          stock_nuevo: 0,
          motivo: normalizarTextoMayusculas(`CAJA AGOTADA EN SU TOTALIDAD (${totalFrascos} FRASCOS CONSUMIDOS) EN ${equipoAsociado}`),
          referencia: normalizarTextoMayusculas(`LOTE: ${lote.NumeroLote} - FINALIZADO POR ${usuario}`),
          creado_por: 1
        }
      });

      // B. Buscar la siguiente caja cerrada en nevera
      const siguienteCaja = await tx.lotesReactivos.findFirst({
        where: {
          InventarioId: lote.InventarioId,
          FechaApertura: null,
          Id: { not: lote.Id },
          estado_transferencia: { in: ['RECIBIDO_LABORATORIO', 'LABORATORIO'] }
        },
        orderBy: { FechaVencimiento: 'asc' }
      });

      let siguienteActivada = null;
      if (siguienteCaja) {
        // Regla estricta desde la Ficha de Producto:
        const nextTotalFrascos = Number(lote.items_inventario?.frascos_por_caja) || 1;
        const nextVolPorFrasco = Number(lote.items_inventario?.volumen_por_frasco) || (Number(lote.items_inventario?.volumen_total_caja) / nextTotalFrascos) || 50;
        const nextVolTotalCaja = Number(lote.items_inventario?.volumen_total_caja) || (nextTotalFrascos * nextVolPorFrasco);
        const nextConsumoPorPrueba = Number(lote.items_inventario?.consumo_indicado) || 0.25;

        const nextPruebasPorFrasco = Number(lote.items_inventario?.pruebas_teoricas_frasco) || Math.floor(nextVolPorFrasco / nextConsumoPorPrueba);
        const nextPruebasPorCaja = Number(lote.items_inventario?.pruebas_teoricas_caja) || (nextPruebasPorFrasco * nextTotalFrascos);

        const nextMeta = {
          frasco_actual: 1,
          total_frascos: nextTotalFrascos,
          vol_por_frasco: nextVolPorFrasco,
          volumen_total_caja: nextVolTotalCaja,
          consumo_indicado: nextConsumoPorPrueba,
          pruebas_por_frasco: nextPruebasPorFrasco,
          pruebas_por_caja: nextPruebasPorCaja,
          equipo_asociado: equipoAsociado,
          fecha_apertura_frasco_1: new Date().toISOString()
        };

        siguienteActivada = await tx.lotesReactivos.update({
          where: { Id: siguienteCaja.Id },
          data: {
            Estado: 'Activo',
            FechaApertura: new Date(),
            UsuarioApertura: usuario,
            CantidadActual: nextVolTotalCaja,
            CantidadInicial: nextVolTotalCaja,
            ConsumoPorPrueba: nextConsumoPorPrueba,
            ReactivoPorPrueba: nextConsumoPorPrueba,
            PruebasTeoricas: nextPruebasPorCaja,
            PruebasRestantes: nextPruebasPorCaja,
            CondicionesEspeciales: JSON.stringify(nextMeta)
          }
        });

        await tx.movimientoInventario.create({
          data: {
            item_id: lote.InventarioId,
            tipo_movimiento: 'APERTURA_CAJA',
            cantidad: 0,
            stock_anterior: Number(siguienteCaja.CantidadActual),
            stock_nuevo: Number(siguienteCaja.CantidadActual),
            motivo: normalizarTextoMayusculas(`APERTURA Y ACTIVACION AUTOMATICA DE NUEVA CAJA TRAS AGOTARSE LOTE ${lote.NumeroLote}`),
            referencia: normalizarTextoMayusculas(`LOTE: ${siguienteCaja.NumeroLote} - FRASCO 1 ACTIVO EN ${equipoAsociado}`),
            creado_por: 1
          }
        });
      }

      return { loteAgotado, siguienteActivada };
    });

    return {
      success: true,
      message: result.siguienteActivada 
        ? `ðŸ Caja ${lote.NumeroLote} finalizada (AGOTADA). ðŸš€ Caja ${result.siguienteActivada.NumeroLote} activada desde la Nevera (Frasco 1 en uso).`
        : `ðŸ Caja ${lote.NumeroLote} finalizada (AGOTADA). (No hay mÃ¡s cajas cerradas en la nevera).`,
      cajaAgotada: result.loteAgotado,
      siguienteCaja: result.siguienteActivada
    };
  }

  /**
   * Validacion Ãgil (3 Pruebas) para DemostraciÃ³n al Cliente:
   * Simula 3 pruebas clÃ­nicas sucesivas en el lote, completando el ciclo de la caja
   * y activando de inmediato la siguiente caja de la nevera.
   */
  async simularValidacionTresPruebas({ loteId, usuarioNombre }) {
    const lote = await prisma.lotesReactivos.findUnique({
      where: { Id: parseInt(loteId) },
      include: { items_inventario: true }
    });

    if (!lote) throw new Error('Caja o lote no encontrado.');

    const itemName = (lote.items_inventario?.nombre || '').toUpperCase();
    const testName = itemName.includes('CALCIO') ? 'CAAIII' : (itemName.includes('UREA') ? 'UREA' : (itemName.includes('COLEST') ? 'COLESTEROL TOTAL' : 'TEST_VAL'));
    const devName = 'CM 260i';

    // Generar 3 registros en logSniffer para demostrar la trazabilidad real
    for (let i = 1; i <= 3; i++) {
      await prisma.logSniffer.create({
        data: {
          test_name: testName,
          patient_id: `DEMO-VAL-${Date.now().toString().slice(-4)}-${i}`,
          is_qc: false,
          is_calibracion: false,
          is_repeticion: false,
          equipo_origen: devName,
          raw_frame: `SIMULACION VALIDACION PRUEBA ${i}/3`,
          lote_afectado_id: lote.Id,
          ml_descontados: 0.25,
          fecha_registro: new Date(),
          procesado: true
        }
      });
    }

    // Ejecutar la transicion de agotamiento y activacion de la siguiente caja
    return await this.finalizarCajaYActivarSiguiente({ loteId, usuarioNombre: usuarioNombre || 'Sistema' });
  }

  /**
   * Obtener todas las cajas que se encuentran actualmente EN TRÃNSITO desde AlmacÃ©n Central hacia Laboratorio
   */
  async getCajasEnTransito() {
    const lotes = await prisma.lotesReactivos.findMany({
      where: {
        estado_transferencia: 'EN_TRANSITO_LAB'
      },
      include: {
        items_inventario: true
      },
      orderBy: { fecha_despacho: 'desc' }
    });

    return lotes.map(lote => ({
      id: lote.Id,
      inventarioId: lote.InventarioId,
      productoNombre: lote.items_inventario?.nombre || 'Reactivo',
      productoCodigo: lote.items_inventario?.codigo || '',
      numeroLote: lote.NumeroLote,
      fechaVencimiento: lote.FechaVencimiento,
      usuarioDespacho: lote.usuario_despacho || 'AlmacÃ©n Central',
      fechaDespacho: lote.fecha_despacho,
      almacenOrigenId: lote.almacen_origen_id || 1,
      almacenDestinoId: lote.almacen_destino_id || 2,
      estadoTransferencia: lote.estado_transferencia
    }));
  }

  /**
   * FASE 1: Despachar Caja desde Almacen Central hacia Laboratorio (Estado: EN_TRANSITO_LAB)
   */
  async despacharCajaAlmacen({ loteId, almacenDestinoId, usuarioDespacho }) {
    const lote = await prisma.lotesReactivos.findUnique({
      where: { Id: parseInt(loteId) },
      include: { items_inventario: true }
    });

    if (!lote) throw new Error('Caja o lote no encontrado.');

    const usuario = usuarioDespacho || 'Encargado de Almacen';
    const destId = almacenDestinoId ? parseInt(almacenDestinoId) : 2;

    const updated = await prisma.$transaction(async (tx) => {
      const loteActualizado = await tx.lotesReactivos.update({
        where: { Id: lote.Id },
        data: {
          estado_transferencia: 'EN_TRANSITO_LAB',
          almacen_origen_id: 1,
          almacen_destino_id: destId,
          usuario_despacho: usuario,
          fecha_despacho: new Date()
        }
      });

      await tx.movimientoInventario.create({
        data: {
          item_id: lote.InventarioId,
          tipo_movimiento: 'DESPACHO_LABORATORIO',
          cantidad: 1,
          stock_anterior: Number(lote.CantidadActual),
          stock_nuevo: Number(lote.CantidadActual),
          almacen_id: 1,
          almacen_destino_id: destId,
          motivo: 'DESPACHO DE CAJA A LABORATORIO (EN TRANSITO)',
          referencia: normalizarTextoMayusculas(`LOTE: ${lote.NumeroLote} - DESPACHADO POR ${usuario}`),
          creado_por: 1
        }
      });

      return loteActualizado;
    });

    return {
      success: true,
      message: ` Caja del lote ${lote.NumeroLote} despachada hacia el Laboratorio. Estado: EN TRÃNSITO.`,
      lote: updated
    };
  }

  /**
   * FASE 2: Confirmacion Electronica de Recepcion en Laboratorio (Escaner o Clic)
   * Cambia el estado a RECIBIDO_LABORATORIO (Nevera / Reserva) y registra usuario y timestamp
   */
  async confirmarRecepcionElectronica({ barcode, loteId, usuarioRecepcion }) {
    let lote = null;
    const usuario = usuarioRecepcion || 'Sistema';

    if (loteId) {
      lote = await prisma.lotesReactivos.findUnique({
        where: { Id: parseInt(loteId) },
        include: { items_inventario: true }
      });
    } else if (barcode) {
      const raw = String(barcode).trim();
      let loteCode = raw;
      if (raw.startsWith('01') && raw.length >= 16) {
        const resto = raw.substring(16);
        loteCode = resto.startsWith('10') ? resto.substring(2) : resto;
      }

      lote = await prisma.lotesReactivos.findFirst({
        where: {
          NumeroLote: { contains: loteCode }
        },
        include: { items_inventario: true }
      });
    }

    if (!lote) {
      throw new Error(`Caja o cÃ³digo "${barcode || loteId}" no encontrado.`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const loteActualizado = await tx.lotesReactivos.update({
        where: { Id: lote.Id },
        data: {
          estado_transferencia: 'RECIBIDO_LABORATORIO',
          almacen_destino_id: 2,
          usuario_recepcion: usuario,
          fecha_recepcion_lab: new Date()
        }
      });

      const existsStock = await tx.stockPorAlmacen.findUnique({
        where: { item_id_almacen_id: { item_id: lote.InventarioId, almacen_id: 2 } }
      });
      if (existsStock) {
        await tx.stockPorAlmacen.update({
          where: { item_id_almacen_id: { item_id: lote.InventarioId, almacen_id: 2 } },
          data: { stock_actual: { increment: 1 } }
        });
      } else {
        await tx.stockPorAlmacen.create({
          data: { item_id: lote.InventarioId, almacen_id: 2, stock_actual: Number(lote.CantidadActual) || 1 }
        });
      }

      const allStocksRec = await tx.stockPorAlmacen.findMany({
        where: { item_id: lote.InventarioId }
      });
      const sumGlobalRec = allStocksRec.reduce((acc, s) => acc + Number(s.stock_actual), 0);
      await tx.itemInventario.update({
        where: { id: lote.InventarioId },
        data: { stock_actual: sumGlobalRec }
      });

      await tx.movimientoInventario.create({
        data: {
          item_id: lote.InventarioId,
          tipo_movimiento: 'RECEPCION_ELECTRONICA_LAB',
          cantidad: 1,
          stock_anterior: Number(lote.CantidadActual),
          stock_nuevo: Number(lote.CantidadActual),
          almacen_id: lote.almacen_origen_id || 1,
          almacen_destino_id: lote.almacen_destino_id || 2,
          motivo: 'CONFIRMACION ELECTRONICA DE RECEPCION EN LABORATORIO',
          referencia: normalizarTextoMayusculas(`LOTE: ${lote.NumeroLote} - RECIBIDO POR ${usuario}`),
          creado_por: 1
        }
      });

      return loteActualizado;
    });

    return {
      success: true,
      message: `ðŸ“¥ ConfirmaciÃ³n ElectrÃ³nica Exitosa: Caja del lote ${lote.NumeroLote} ingresada a la Nevera de Reserva del Laboratorio por ${usuario}.`,
      lote: updated
    };
  }

  /**
   * Rechazar y Devolver Caja a AlmacÃ©n Central desde RecepciÃ³n de Laboratorio
   */
  async rechazarDevolverAlmacen({ loteId, motivo, usuarioNombre }) {
    const lote = await prisma.lotesReactivos.findUnique({
      where: { Id: parseInt(loteId) },
      include: { items_inventario: true }
    });

    if (!lote) throw new Error('Caja o lote no encontrado.');

    const usuario = usuarioNombre || 'Sistema';
    const razon = motivo || 'DevoluciÃ³n desde RecepciÃ³n de Laboratorio';

    const updated = await prisma.$transaction(async (tx) => {
      const loteActualizado = await tx.lotesReactivos.update({
        where: { Id: lote.Id },
        data: {
          estado_transferencia: 'ALMACEN_CENTRAL',
          almacen_destino_id: 1,
          fecha_despacho: null,
          usuario_despacho: null
        }
      });

      await tx.stockPorAlmacen.updateMany({
        where: { item_id: lote.InventarioId, almacen_id: 1 },
        data: { stock_actual: { increment: Number(lote.CantidadActual) || 1 } }
      });

      const allStocksDev = await tx.stockPorAlmacen.findMany({
        where: { item_id: lote.InventarioId }
      });
      const sumGlobalDev = allStocksDev.reduce((acc, s) => acc + Number(s.stock_actual), 0);
      await tx.itemInventario.update({
        where: { id: lote.InventarioId },
        data: { stock_actual: sumGlobalDev }
      });

      await tx.movimientoInventario.create({
        data: {
          item_id: lote.InventarioId,
          tipo_movimiento: 'DEVOLUCION_ALMACEN',
          cantidad: 1,
          stock_anterior: Number(lote.CantidadActual),
          stock_nuevo: Number(lote.CantidadActual),
          almacen_id: 2,
          almacen_destino_id: 1,
          motivo: normalizarTextoMayusculas(`DEVOLUCION DE CAJA A ALMACEN CENTRAL: ${razon}`),
          referencia: normalizarTextoMayusculas(`LOTE: ${lote.NumeroLote} - RECHAZADO POR ${usuario}`),
          creado_por: 1
        }
      });

      return loteActualizado;
    });

    return {
      success: true,
      message: `â†©ï¸ Caja del lote ${lote.NumeroLote} devuelta a AlmacÃ©n Central. RazÃ³n: ${razon}.`,
      lote: updated
    };
  }


  async procesarRecepcionMasiva({ loteIds, action, usuario }) {
    if (!loteIds || loteIds.length === 0) return { success: false, message: 'No hay cajas seleccionadas' };
    
    let nuevoEstado = '';
    let tipoMovimiento = '';
    let motivo = '';
    let mensajeExito = '';
    const batchRef = action === 'RECHAZAR' ? `RECHAZO-${Date.now().toString().slice(-6)}` : `RECEPCION-${Date.now().toString().slice(-6)}`;

    if (action === 'RECHAZAR') {
      nuevoEstado = 'ALMACEN_CENTRAL';
      tipoMovimiento = 'DEVOLUCION_ALMACEN';
      motivo = 'DEVOLUCION MASIVA RECHAZADA POR LABORATORIO';
      mensajeExito = `${loteIds.length} cajas devueltas al Almacen Central con exito.`;
    } else {
      nuevoEstado = 'RECIBIDO_LABORATORIO';
      tipoMovimiento = 'RECEPCION_ELECTRONICA_LAB';
      motivo = 'RECEPCION ELECTRONICA MASIVA EN LABORATORIO';
      mensajeExito = `${loteIds.length} cajas recibidas en la Reserva de Nevera con exito.`;
    }

    const lotes = await prisma.lotesReactivos.findMany({
      where: { Id: { in: loteIds.map(id => parseInt(id)) } },
      include: { items_inventario: true }
    });

    await prisma.$transaction(async (tx) => {
      await tx.lotesReactivos.updateMany({
        where: { Id: { in: loteIds.map(id => parseInt(id)) } },
        data: {
          estado_transferencia: nuevoEstado,
          almacen_destino_id: action !== 'RECHAZAR' ? 2 : 1,
          usuario_recepcion: action !== 'RECHAZAR' ? usuario : null,
          fecha_recepcion_lab: action !== 'RECHAZAR' ? new Date() : null,
          usuario_despacho: action === 'RECHAZAR' ? null : undefined,
          fecha_despacho: action === 'RECHAZAR' ? null : undefined
        }
      });

      // Actualizacion de stock basada en la accion
      const itemCounts = {};
      for (const lote of lotes) {
        itemCounts[lote.InventarioId] = (itemCounts[lote.InventarioId] || 0) + 1;
      }

      for (const [itemId, count] of Object.entries(itemCounts)) {
        if (action === 'RECHAZAR') {
          await tx.stockPorAlmacen.updateMany({
            where: { item_id: parseInt(itemId), almacen_id: 1 },
            data: { stock_actual: { increment: count } }
          });
        } else {
          const exists = await tx.stockPorAlmacen.findUnique({
            where: { item_id_almacen_id: { item_id: parseInt(itemId), almacen_id: 2 } }
          });
          
          if (exists) {
            await tx.stockPorAlmacen.update({
              where: { item_id_almacen_id: { item_id: parseInt(itemId), almacen_id: 2 } },
              data: { stock_actual: { increment: count } }
            });
          } else {
            await tx.stockPorAlmacen.create({
              data: { item_id: parseInt(itemId), almacen_id: 2, stock_actual: count }
            });
          }
        }

        const allStocksMas = await tx.stockPorAlmacen.findMany({
          where: { item_id: parseInt(itemId) }
        });
        const sumGlobalMas = allStocksMas.reduce((acc, s) => acc + Number(s.stock_actual), 0);
        await tx.itemInventario.update({
          where: { id: parseInt(itemId) },
          data: { stock_actual: sumGlobalMas }
        });
      }

      for (const lote of lotes) {
        await tx.movimientoInventario.create({
          data: {
            item_id: lote.InventarioId,
            tipo_movimiento: tipoMovimiento,
            cantidad: 1,
            stock_anterior: Number(lote.CantidadActual),
            stock_nuevo: Number(lote.CantidadActual),
            almacen_id: action === 'RECHAZAR' ? 2 : (lote.almacen_origen_id || 1),
            almacen_destino_id: action === 'RECHAZAR' ? 1 : (lote.almacen_destino_id || 2),
            motivo: normalizarTextoMayusculas(motivo),
            referencia: normalizarTextoMayusculas(batchRef),
            creado_por: 1
          }
        });
      }
    });

    return { success: true, message: mensajeExito, batchRef };
  }

}

module.exports = new CajasService();

