const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
        OR: [
          { items_inventario: { equipo_asociado: null } },
          { items_inventario: { equipo_asociado: { not: 'Mindray CL-900i' } } }
        ]
      },
      include: {
        items_inventario: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            marca: true,
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

    // 1. Conteo total histórico y conteo de hoy desde el sniffer
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

      const totalFrascos = Number(meta.total_frascos || lote.items_inventario?.frascos_por_caja) || 4;
      const volPorFrasco = Number(meta.vol_por_frasco || lote.items_inventario?.volumen_por_frasco) || 45;
      const pruebasPorFrasco = Number(meta.pruebas_por_frasco || lote.items_inventario?.pruebas_teoricas_frasco) || 180;
      const pruebasPorCaja = Number(meta.pruebas_por_caja || lote.items_inventario?.pruebas_teoricas_caja) || (pruebasPorFrasco * totalFrascos);
      const totalVolCaja = Number(meta.volumen_total_caja || (totalFrascos * volPorFrasco));

      const statsTotal = consumoTotalPorLote[lote.Id] || { count: 0, ml: 0 };
      const statsHoy = consumoHoyPorLote[lote.Id] || { count: 0, ml: 0 };

      const pruebasConsumidasLoteTotal = statsTotal.count;
      const mlConsumidosLoteTotal = statsTotal.ml;

      // 🔄 AUTO-TRANSICIÓN AUTOMÁTICA DE FRASCOS (Sin necesidad de clic manual):
      // Si el volumen total acumulado consumido supera la capacidad de los frascos anteriores, avanza automáticamente
      const frascoCalculadoPorConsumo = Math.min(totalFrascos, Math.floor(mlConsumidosLoteTotal / volPorFrasco) + 1);
      let frascoActual = Math.max(Number(meta.frasco_actual) || 1, frascoCalculadoPorConsumo);

      // Si el frasco actual cambió de forma automática por el consumo del Sniffer, persistir en metadata
      if (frascoActual !== meta.frasco_actual && frascoActual <= totalFrascos) {
        meta.frasco_actual = frascoActual;
        meta[`fecha_apertura_frasco_${frascoActual}`] = meta[`fecha_apertura_frasco_${frascoActual}`] || new Date().toISOString();
        prisma.lotesReactivos.update({
          where: { Id: lote.Id },
          data: { CondicionesEspeciales: JSON.stringify(meta) }
        }).catch(() => {});
      }

      const defaultEq = (lote.items_inventario?.marca || '').toLowerCase().includes('mindray') ? 'Mindray BS-230' : 'CM 260i';
      const equipoAsociado = meta.equipo_asociado || defaultEq;

      // Descuento exacto por frasco en uso a través de los días:
      const consumoPorPrueba = Number(meta.consumo_indicado || lote.items_inventario?.consumo_indicado) || 0.25;
      const mlRestantesCaja = Number(Math.min(totalVolCaja, Math.max(0, totalVolCaja - mlConsumidosLoteTotal, Number(lote.CantidadActual))).toFixed(2));
      const pruebasRestantesCaja = Math.max(0, Math.floor(mlRestantesCaja / consumoPorPrueba));

      const mlConsumidosEnFrascosPrevios = (frascoActual - 1) * volPorFrasco;
      const mlConsumidosEnFrascoActual = Math.max(0, mlConsumidosLoteTotal - mlConsumidosEnFrascosPrevios);
      const mlRestantesFrasco = Number(Math.min(volPorFrasco, Math.max(0, volPorFrasco - mlConsumidosEnFrascoActual)).toFixed(2));
      const pruebasRestantesFrasco = Math.max(0, Math.floor(mlRestantesFrasco / consumoPorPrueba));
      const porcentajeRestante = volPorFrasco > 0 ? Math.min(100, Math.round((mlRestantesFrasco / volPorFrasco) * 100)) : 0;

      const esCajaAgotada = lote.Estado === 'Agotado' || mlRestantesCaja <= 0 || (frascoActual >= totalFrascos && mlRestantesFrasco <= 0 && mlConsumidosLoteTotal >= totalVolCaja);

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
          const agotado = mlRestantesFrasco <= 0;
          frascos.push({
            numero: f,
            estado: agotado ? 'AGOTADO' : 'EN USO',
            mlRestantes: mlRestantesFrasco,
            volumenTotal: volPorFrasco,
            porcentaje: porcentajeRestante,
            esActual: true,
            color: agotado ? '#ef4444' : (porcentajeRestante < 20 ? '#f59e0b' : '#10b981')
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
        // Caja transferida al laboratorio pero que aún no ha sido abierta por el bioanalista
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

    const defaultEquipo = (lote.items_inventario?.marca || '').toLowerCase().includes('mindray') ? 'Mindray BS-230' : 'CM 260i';
    const equipoFinal = equipo || defaultEquipo;
    const usuarioFinal = usuarioNombre || 'Bioanalista';

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
      // 1. Activar lote y registrar apertura de la caja con volumen total en mL y pruebas teóricas completas
      const loteActualizado = await tx.lotesReactivos.update({
        where: { Id: lote.Id },
        data: {
          Estado: 'Activo',
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

      // 2. Asentar movimiento en el Kárdex
      await tx.movimientoInventario.create({
        data: {
          item_id: lote.InventarioId,
          tipo_movimiento: 'APERTURA_CAJA',
          cantidad: 0,
          stock_anterior: Number(lote.CantidadActual),
          stock_nuevo: Number(lote.CantidadActual),
          motivo: `Apertura de Caja (Frasco 1 en uso) en ${equipoFinal}`,
          referencia: `Lote: ${lote.NumeroLote} - Apertura por ${usuarioFinal}`,
          creado_por: 1
        }
      });

      return loteActualizado;
    });

    return {
      success: true,
      message: `✅ Caja del lote ${lote.NumeroLote} ABIERTA con éxito por ${usuarioFinal}. Frasco 1 colocado en ${equipoFinal}.`,
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
        message: `🏁 La caja del lote ${lote.NumeroLote} ha finalizado todos sus ${totalFrascos} frascos.`
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
      message: `✅ Frasco ${nuevoFrasco} de ${totalFrascos} colocado en el analizador del lote ${lote.NumeroLote}.`,
      lote: updated
    };
  }

  /**
   * Parser Inteligente de Escaneo de Códigos de Barras:
   * Recibe la lectura de la pistola láser (GS1-128 de caja o código de frasco)
   */
  async procesarEscaneo({ barcode, usuarioNombre, equipo }) {
    const raw = String(barcode).trim();
    console.log('🔍 [CajasService] Procesando código escaneado o búsqueda manual:', raw);

    let gtin = null;
    let loteDetectado = null;

    // A) Detectar estándar GS1-128 (ej: 017791778040338410LDK0527060)
    if (raw.startsWith('01') && raw.length >= 16) {
      gtin = raw.substring(2, 16); // 14 dígitos de GTIN
      const resto = raw.substring(16);
      if (resto.startsWith('10')) {
        loteDetectado = resto.substring(2); // Lo que sigue de (10) es el lote
      } else {
        loteDetectado = resto;
      }
    } else if (raw.includes('LDK') || raw.includes('LOT') || raw.length >= 6) {
      loteDetectado = raw;
    }

    // Colectar términos de búsqueda para consulta multicriterio
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
        message: `⚠️ Búsqueda/Escaneo: "${raw}". No se encontró ningún lote o reactivo registrado por Lote, Código, Nombre o Código de Barra.`
      };
    }

    // Priorizar selección según el ciclo operativo:
    // 1. Cajas en tránsito hacia laboratorio (Pendiente por confirmar recepción)
    // 2. Cajas cerradas en reserva/nevera (Pendiente por abrir para uso)
    // 3. Cajas activas en analizadores
    let lote = candidatos.find(c => c.estado_transferencia === 'EN_TRANSITO');
    if (!lote) {
      lote = candidatos.find(c => !c.FechaApertura || c.Estado === 'Cerrado');
    }
    if (!lote) {
      lote = candidatos[0];
    }

    // Si la caja estaba EN TRANSITO, confirmar su recepción electrónica a la nevera del laboratorio
    if (lote.estado_transferencia === 'EN_TRANSITO') {
      await this.confirmarRecepcionElectronica({
        loteId: lote.Id,
        usuarioRecepcion: usuarioNombre || 'Bioanalista (Recepción)'
      });

      return {
        success: true,
        reconocido: true,
        accion: 'RECEPCION_CONFIRMADA',
        producto: lote.items_inventario?.nombre,
        lote: lote.NumeroLote,
        message: `🟢 ¡Recepción Electrónica Confirmada! Reactivo: ${lote.items_inventario?.nombre} | Lote: ${lote.NumeroLote}. Caja ingresada a Reserva de Nevera.`
      };
    }

    // Si la caja está CERRADA en nevera, abrirla para el analizador
    const esCajaCerrada = !lote.FechaApertura || lote.Estado === 'Cerrado';
    if (esCajaCerrada) {
      const equipoDestino = equipo || ((lote.items_inventario?.marca || '').toLowerCase().includes('mindray') ? 'Mindray BS-230' : 'CM 260i');
      await this.abrirCaja({
        loteId: lote.Id,
        usuarioNombre: usuarioNombre || 'Bioanalista (Validación)',
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
        message: `🟢 ¡Caja Abierta por Validación! Reactivo: ${lote.items_inventario?.nombre} | Lote: ${lote.NumeroLote}. Frasco 1 colocado en ${equipoDestino}.`
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
        message: `ℹ️ Caja ya en uso activo. Reactivo: ${lote.items_inventario?.nombre} | Lote: ${lote.NumeroLote} | Frasco actual: ${meta.frasco_actual || 1}.`
      };
    }
  }

  /**
   * Finalizar Caja y Activar Automáticamente la Siguiente Caja en Nevera:
   * 1. Marca la caja actual como Agotada.
   * 2. Busca la siguiente caja del mismo reactivo en la nevera (Almacén Laboratorio / Estado Cerrada).
   * 3. Si existe, la activa a 'Activo' con frasco 1 en uso.
   * 4. Registra el movimiento en Kárdex.
   */
  async finalizarCajaYActivarSiguiente({ loteId, usuarioNombre }) {
    const lote = await prisma.lotesReactivos.findUnique({
      where: { Id: parseInt(loteId) },
      include: { items_inventario: true }
    });

    if (!lote) {
      throw new Error('Caja o lote no encontrado.');
    }

    const usuario = usuarioNombre || 'Bioanalista';
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
          motivo: `Caja agotada en su totalidad (${totalFrascos} frascos consumidos) en ${equipoAsociado}`,
          referencia: `Lote: ${lote.NumeroLote} - Finalizado por ${usuario}`,
          creado_por: 1
        }
      });

      // B. Buscar la siguiente caja cerrada en nevera
      const siguienteCaja = await tx.lotesReactivos.findFirst({
        where: {
          InventarioId: lote.InventarioId,
          FechaApertura: null,
          Id: { not: lote.Id }
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
            motivo: `Apertura y activación automática de nueva caja desde Nevera tras agotarse el lote ${lote.NumeroLote}`,
            referencia: `Lote: ${siguienteCaja.NumeroLote} - Frasco 1 activo en ${equipoAsociado}`,
            creado_por: 1
          }
        });
      }

      return { loteAgotado, siguienteActivada };
    });

    return {
      success: true,
      message: result.siguienteActivada 
        ? `🏁 Caja ${lote.NumeroLote} finalizada (AGOTADA). 🚀 Caja ${result.siguienteActivada.NumeroLote} activada desde la Nevera (Frasco 1 en uso).`
        : `🏁 Caja ${lote.NumeroLote} finalizada (AGOTADA). (No hay más cajas cerradas en la nevera).`,
      cajaAgotada: result.loteAgotado,
      siguienteCaja: result.siguienteActivada
    };
  }

  /**
   * Validación Ágil (3 Pruebas) para Demostración al Cliente:
   * Simula 3 pruebas clínicas sucesivas en el lote, completando el ciclo de la caja
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

    // Ejecutar la transición de agotamiento y activación de la siguiente caja
    return await this.finalizarCajaYActivarSiguiente({ loteId, usuarioNombre: usuarioNombre || 'Bioanalista Validador' });
  }

  /**
   * Obtener todas las cajas que se encuentran actualmente EN TRÁNSITO desde Almacén Central hacia Laboratorio
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
      usuarioDespacho: lote.usuario_despacho || 'Almacén Central',
      fechaDespacho: lote.fecha_despacho,
      almacenOrigenId: lote.almacen_origen_id || 1,
      almacenDestinoId: lote.almacen_destino_id || 2,
      estadoTransferencia: lote.estado_transferencia
    }));
  }

  /**
   * FASE 1: Despachar Caja desde Almacén Central hacia Laboratorio (Estado: EN_TRANSITO_LAB)
   */
  async despacharCajaAlmacen({ loteId, almacenDestinoId, usuarioDespacho }) {
    const lote = await prisma.lotesReactivos.findUnique({
      where: { Id: parseInt(loteId) },
      include: { items_inventario: true }
    });

    if (!lote) throw new Error('Caja o lote no encontrado.');

    const usuario = usuarioDespacho || 'Encargado de Almacén';
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
          motivo: `Despacho de Caja a Laboratorio (En Tránsito)`,
          referencia: `Lote: ${lote.NumeroLote} - Despachado por ${usuario}`,
          creado_por: 1
        }
      });

      return loteActualizado;
    });

    return {
      success: true,
      message: `🚚 Caja del lote ${lote.NumeroLote} despachada hacia el Laboratorio. Estado: EN TRÁNSITO.`,
      lote: updated
    };
  }

  /**
   * FASE 2: Confirmación Electrónica de Recepción en Laboratorio (Escáner o Clic)
   * Cambia el estado a RECIBIDO_LABORATORIO (Nevera / Reserva) y registra usuario y timestamp
   */
  async confirmarRecepcionElectronica({ barcode, loteId, usuarioRecepcion }) {
    let lote = null;
    const usuario = usuarioRecepcion || 'Bioanalista Receptores';

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
      throw new Error(`Caja o código "${barcode || loteId}" no encontrado.`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const loteActualizado = await tx.lotesReactivos.update({
        where: { Id: lote.Id },
        data: {
          estado_transferencia: 'RECIBIDO_LABORATORIO',
          usuario_recepcion: usuario,
          fecha_recepcion_lab: new Date()
        }
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
          motivo: `Confirmación Electrónica de Recepción en Laboratorio`,
          referencia: `Lote: ${lote.NumeroLote} - Recibido por ${usuario}`,
          creado_por: 1
        }
      });

      return loteActualizado;
    });

    return {
      success: true,
      message: `📥 Confirmación Electrónica Exitosa: Caja del lote ${lote.NumeroLote} ingresada a la Nevera de Reserva del Laboratorio por ${usuario}.`,
      lote: updated
    };
  }

  /**
   * Rechazar y Devolver Caja a Almacén Central desde Recepción de Laboratorio
   */
  async rechazarDevolverAlmacen({ loteId, motivo, usuarioNombre }) {
    const lote = await prisma.lotesReactivos.findUnique({
      where: { Id: parseInt(loteId) },
      include: { items_inventario: true }
    });

    if (!lote) throw new Error('Caja o lote no encontrado.');

    const usuario = usuarioNombre || 'Bioanalista';
    const razon = motivo || 'Devolución desde Recepción de Laboratorio';

    const updated = await prisma.$transaction(async (tx) => {
      const loteActualizado = await tx.lotesReactivos.update({
        where: { Id: lote.Id },
        data: {
          estado_transferencia: 'ALMACEN_CENTRAL',
          fecha_despacho: null,
          usuario_despacho: null
        }
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
          motivo: `Devolución de Caja a Almacén Central: ${razon}`,
          referencia: `Lote: ${lote.NumeroLote} - Rechazado por ${usuario}`,
          creado_por: 1
        }
      });

      return loteActualizado;
    });

    return {
      success: true,
      message: `↩️ Caja del lote ${lote.NumeroLote} devuelta a Almacén Central. Razón: ${razon}.`,
      lote: updated
    };
  }

}

module.exports = new CajasService();
