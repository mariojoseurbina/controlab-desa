const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Herramienta 1: Reporte Diario de Sniffer
const obtenerReporteDiarioSniffer = async ({ fecha }) => {
    try {
        console.log(`[Agent Tool] Ejecutando obtenerReporteDiarioSniffer para la fecha: ${fecha}`);

        let logs = [];
        let displayDate = "";
        let startOfDayDate = new Date();

        if (fecha) {
            const targetDate = new Date(fecha);
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
            logs = await prisma.logSniffer.findMany({
                where: { fecha_registro: { gte: startOfDay, lte: endOfDay } }
            });
            startOfDayDate = startOfDay;
            displayDate = startOfDay.toLocaleDateString();
        } else {
            const lastLog = await prisma.logSniffer.findFirst({
                orderBy: { fecha_registro: 'desc' }
            });
            
            if (lastLog) {
                const targetDate = new Date(lastLog.fecha_registro);
                const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
                const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
                logs = await prisma.logSniffer.findMany({
                    where: { fecha_registro: { gte: startOfDay, lte: endOfDay } }
                });
                startOfDayDate = startOfDay;
                displayDate = `${startOfDay.toLocaleDateString()} (Último día activo)`;
            } else {
                displayDate = new Date().toLocaleDateString();
            }
        }

        if (!logs || logs.length === 0) {
            return `No se interceptó tráfico de red para el día ${displayDate}.`;
        }

        const totalPruebas = logs.length;
        const mermas = logs.filter(log => log.is_qc === true);
        const pruebasNormales = logs.filter(log => log.is_qc === false);

        const mermasPorPrueba = {};
        mermas.forEach(m => {
            mermasPorPrueba[m.test_name] = (mermasPorPrueba[m.test_name] || 0) + 1;
        });

        let reporte = `**Reporte de Auditoría de Red (Sniffer)**\n`;
        reporte += `Fecha: ${startOfDayDate.toLocaleDateString()}\n`;
        reporte += `Total de tramas procesadas en la red: ${totalPruebas}\n`;
        reporte += `Pruebas de pacientes normales: ${pruebasNormales.length}\n`;
        reporte += `**Controles de Calidad y Repeticiones (Mermas detectadas): ${mermas.length}**\n\n`;

        if (mermas.length > 0) {
            reporte += `Desglose de mermas por prueba:\n`;
            for (const [test, count] of Object.entries(mermasPorPrueba)) {
                reporte += `- Prueba ${test}: ${count} mermas detectadas.\n`;
            }
        }

        return reporte;

    } catch (error) {
        console.error('[Agent Tool Error] obtenerReporteDiarioSniffer:', error);
        return "Hubo un error al extraer el reporte del Sniffer. Notifica al administrador.";
    }
};

// Herramienta 2: Reporte Consolidado Universal de Reactivo con TODOS los Lotes y Detalle Clínico
const obtenerReporteCompletoReactivo = async ({ nombreReactivo }) => {
    try {
        console.log(`[Agent Tool] Generando reporte unificado multi-lote para: ${nombreReactivo}`);
        const busqueda = (nombreReactivo || '').trim();
        if (!busqueda) return "Por favor especifica el nombre o código del reactivo (ej: Urea, Colesterol, Calcio, Glicemia).";

        const cleanBusqueda = busqueda.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // 1. Buscar en mapeo_pruebas_reactivos
        const mapeos = await prisma.mapeo_pruebas_reactivos.findMany();
        const mappedItemIds = mapeos
            .filter(m => {
                const np = (m.nombre_prueba || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const pb = (m.patron_busqueda || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return np === cleanBusqueda || pb.split('|').map(s=>s.trim()).includes(cleanBusqueda) || np.includes(cleanBusqueda) || pb.includes(cleanBusqueda);
            })
            .map(m => m.reactivo_id);

        // 2. Ranking de items en items_inventario
        const allItems = await prisma.itemInventario.findMany();
        const regexWord = new RegExp(`\\b${cleanBusqueda}\\b`, 'i');

        const scoredItems = allItems.map(i => {
            const nom = (i.nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const cod = (i.codigo || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const ref = (i.referencia_abreviada || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const isMapped = mappedItemIds.includes(i.id);

            let score = 0;
            if (ref === cleanBusqueda || cod === cleanBusqueda || nom === cleanBusqueda) score += 100;
            else if (regexWord.test(ref) || regexWord.test(cod)) score += 80;
            else if (regexWord.test(nom)) score += 60;
            else if (nom.startsWith(cleanBusqueda)) score += 40;
            else if (nom.includes(cleanBusqueda)) score += 30;
            else if (isMapped) score += 20;

            if (score > 0) {
                if (nom.includes('aa liquida') || nom.includes('direct')) score += 15;
                if (cleanBusqueda === 'alt' && nom.includes('alta sensibilidad')) score -= 70;
                if (cleanBusqueda === 'colesterol' && (nom.includes('hdl') || nom.includes('ldl'))) score -= 40;
                if (cleanBusqueda === 'tsh' && nom.includes('accre')) score -= 40;
                if (cleanBusqueda === 'hemograma' && nom.includes('m-53d')) score += 50;
            }
            return { item: i, score };
        }).filter(s => s.score > 0);

        scoredItems.sort((a, b) => b.score - a.score);
        const targetItems = scoredItems.map(s => s.item);
        if (!targetItems || targetItems.length === 0) {
            return `No se encontró ningún reactivo en el catálogo que coincida con "${busqueda}".`;
        }

        const topItem = targetItems[0];
        const targetItemIds = targetItems.map(i => i.id);

        // 3. Buscar TODOS los lotes asociados al reactivo
        const lotes = await prisma.lotesReactivos.findMany({
            where: { InventarioId: { in: targetItemIds } },
            include: { items_inventario: true },
            orderBy: { Id: 'asc' }
        });

        // 4. Analizar métricas de cada lote registrado
        let totalPruebasHistoricas = 0;
        let totalVolumenConsumidoHistorico = 0;
        const lotesDetalle = [];

        for (const l of lotes) {
            let metaLote = {};
            try { if (l.CondicionesEspeciales) metaLote = JSON.parse(l.CondicionesEspeciales); } catch (_) {}

            const logsLote = await prisma.logSniffer.findMany({
                where: { lote_afectado_id: l.Id },
                orderBy: { fecha_registro: 'asc' }
            });

            const pruebasLote = logsLote.length;
            const consumoLote = Number(metaLote.consumo_indicado || l.ConsumoPorPrueba || topItem.consumo_indicado) || 0.25;
            const mlLote = Number((pruebasLote * consumoLote).toFixed(2));

            totalPruebasHistoricas += pruebasLote;
            totalVolumenConsumidoHistorico += mlLote;

            let fechaInicio = logsLote.length > 0 ? logsLote[0].fecha_registro.toISOString().split('T')[0] : (l.FechaApertura ? l.FechaApertura.toISOString().split('T')[0] : 'N/A');
            let fechaFin = logsLote.length > 0 ? logsLote[logsLote.length - 1].fecha_registro.toISOString().split('T')[0] : 'N/A';

            lotesDetalle.push({
                lote: l,
                meta: metaLote,
                pruebas: pruebasLote,
                volumenConsumido: mlLote,
                consumoPorPrueba: consumoLote,
                fechaInicio,
                fechaFin,
                logs: logsLote
            });
        }

        // Determinar el lote activo prioritario
        let loteActivo = lotesDetalle.find(ld => ld.lote.Estado === 'Activo' && ld.lote.FechaApertura !== null);
        if (!loteActivo && lotesDetalle.length > 0) {
            loteActivo = [...lotesDetalle].reverse().find(ld => ld.pruebas > 0) || lotesDetalle[lotesDetalle.length - 1];
        }

        // Consultar stock de almacenes
        const stockCentral = await prisma.stockPorAlmacen.findUnique({
            where: { item_id_almacen_id: { item_id: topItem.id, almacen_id: 1 } }
        });
        const stockLab = await prisma.stockPorAlmacen.findUnique({
            where: { item_id_almacen_id: { item_id: topItem.id, almacen_id: 2 } }
        });
        const cajasCentral = stockCentral ? Number(stockCentral.stock_actual) : 0;
        const cajasLab = stockLab ? Number(stockLab.stock_actual) : 0;

        // Construir informe consolidado en Markdown
        let r = `### 🧬 Informe Consolidado Universal: *${topItem.nombre}*\n\n`;
        r += `* **Código de Reactivo:** \`${topItem.codigo}\` | **Marca:** ${topItem.marca || 'Wiener Lab'}\n`;
        r += `* **Presentación Estándar:** \`${topItem.frascos_por_caja || 1} frasco(s) x ${topItem.volumen_por_frasco || 100} mL\`\n`;
        r += `* **Consumo Clínico:** \`${topItem.consumo_indicado || 0.25} mL\` por prueba\n`;
        r += `* **Pruebas Teóricas por Caja:** **\`${Math.floor((Number(topItem.volumen_total) || 100) / (Number(topItem.consumo_indicado) || 0.25))} pruebas teóricas\`**\n\n`;

        r += `#### 📊 Resumen Ejecutivo del Reactivo:\n`;
        r += `- ⚡ **Total Pruebas Corridas en Analizador (Histórico Total):** **${totalPruebasHistoricas} determinaciones** (${totalVolumenConsumidoHistorico.toFixed(2)} mL debitados por Sniffer)\n`;
        r += `- 📦 **Cajas Cerradas en Stock:** **${cajasCentral} en Almacén Central** | **${cajasLab} en Laboratorio (Nevera)**\n`;
        r += `- 🏷️ **Total Lotes/Cajas Registrados en Sistema:** **${lotes.length} registros**\n\n`;

        r += `---\n\n`;
        r += `### 📋 1. Histórico y Trazabilidad de TODOS los Lotes Registrados\n\n`;
        r += `| N° Lote (ID) | Estado | Ubicación | Apertura / Usuario | Pruebas Teóricas | Pruebas Corridas | Saldo en Sistema | Rango Fechas Corrida |\n`;
        r += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

        lotesDetalle.forEach(ld => {
            const l = ld.lote;
            const estadoBadge = l.Estado === 'Activo' ? '🟢 **Activo**' : (l.Estado === 'Agotado' ? '🔴 Agotado' : '⚪ Cerrado');
            const ubicacionStr = l.almacen_destino_id === 2 || l.Ubicacion === 'Laboratorio' ? 'Laboratorio' : 'Almacén Central';
            const aperturaStr = l.FechaApertura ? `${new Date(l.FechaApertura).toISOString().split('T')[0]}<br><small>(${l.UsuarioApertura || 'Sistema'})</small>` : 'No abierto';
            const teoricas = l.PruebasTeoricas || Math.floor((Number(l.CantidadInicial) || 100) / ld.consumoPorPrueba);
            const saldoStr = `${Number(l.CantidadActual).toFixed(2)} mL`;
            const fechasCorrida = ld.pruebas > 0 ? `${ld.fechaInicio} al ${ld.fechaFin}` : 'Sin corridas';

            r += `| \`${l.NumeroLote}\` <br><small>ID: ${l.Id}</small> | ${estadoBadge} | ${ubicacionStr} | ${aperturaStr} | ${teoricas} pr | **${ld.pruebas} pr** | ${saldoStr} | ${fechasCorrida} |\n`;
        });

        // 5. SECCION DETALLADA DEL LOTE ACTIVO (O MÁS RECIENTE)
        if (loteActivo) {
            const la = loteActivo.lote;
            const meta = loteActivo.meta;
            const totalFrascos = Number(meta.total_frascos || topItem.frascos_por_caja) || 1;
            const volPorFrasco = Number(meta.vol_por_frasco || topItem.volumen_por_frasco) || 100;
            const totalVolCaja = totalFrascos * volPorFrasco;
            const totalTeoricasCaja = Math.floor(totalVolCaja / loteActivo.consumoPorPrueba);

            const prUsadas = loteActivo.pruebas;
            const mlUsados = loteActivo.volumenConsumido;
            const mlRestantes = Number((totalVolCaja - mlUsados).toFixed(2));
            const prRestantes = totalTeoricasCaja - prUsadas;

            r += `\n---\n\n`;
            r += `### 🔬 2. Detalle Operativo del Lote Activo en Analizador: \`${la.NumeroLote}\` (ID: ${la.Id})\n\n`;
            r += `* **Analizador:** ${meta.equipo_asociado || 'CM 260i'} | **Abierto por:** ${la.UsuarioApertura || 'Laboratorio'}\n`;
            r += `* **Capacidad Caja:** ${totalVolCaja} mL (${totalTeoricasCaja} pruebas) | **Consumido:** ${mlUsados.toFixed(2)} mL (${prUsadas} pruebas)\n`;
            r += `* **Saldo Disponible:** **${mlRestantes.toFixed(2)} mL** (**${prRestantes} pruebas restantes**)\n\n`;

            // Desglose por frasco
            r += `#### 🧪 Estado de Frascos de la Caja Activa:\n`;
            const frascoActual = Number(meta.frasco_actual) || 1;
            for (let f = 1; f <= totalFrascos; f++) {
                if (f < frascoActual) {
                    r += `* 🔴 **Frasco ${f} (${volPorFrasco} mL):** **\`AGOTADO\`** (${Math.floor(volPorFrasco / loteActivo.consumoPorPrueba)} pruebas consumidas)\n`;
                } else if (f === frascoActual) {
                    r += `* 🟢 **Frasco ${f} (${volPorFrasco} mL):** **\`EN USO ACTUAL\`** (${prUsadas} pruebas corridas | **${prRestantes} pruebas restantes / ${mlRestantes} mL**)\n`;
                } else {
                    r += `* ⚪ **Frasco ${f} (${volPorFrasco} mL):** **\`SELLADO\`** (${Math.floor(volPorFrasco / loteActivo.consumoPorPrueba)} pruebas intactas)\n`;
                }
            }

            // Desglose por tipo de corrida
            let pac = 0, rpt = 0, cal = 0, qc = 0;
            const porDia = {};
            loteActivo.logs.forEach(lg => {
                const fStr = new Date(lg.fecha_registro).toISOString().split('T')[0];
                if (!porDia[fStr]) porDia[fStr] = { count: 0, pac: 0, rpt: 0, cal: 0, qc: 0 };
                porDia[fStr].count++;
                if (lg.is_qc) { qc++; porDia[fStr].qc++; }
                else if (lg.is_calibracion) { cal++; porDia[fStr].cal++; }
                else if (lg.is_repeticion) { rpt++; porDia[fStr].rpt++; }
                else { pac++; porDia[fStr].pac++; }
            });

            r += `\n#### 🔍 Desglose por Tipo de Corrida (Lote \`${la.NumeroLote}\`):\n`;
            r += `| Tipo de Corrida | Pruebas | Volumen Debitador | Porcentaje |\n`;
            r += `| :--- | :---: | :---: | :---: |\n`;
            r += `| 🧪 **Rutina General (Pacientes)** | **${pac}** | ${(pac * loteActivo.consumoPorPrueba).toFixed(2)} mL | ${prUsadas > 0 ? ((pac/prUsadas)*100).toFixed(1) : 0}% |\n`;
            r += `| 🔄 **Repeticiones Clínicas (RPT)** | **${rpt}** | ${(rpt * loteActivo.consumoPorPrueba).toFixed(2)} mL | ${prUsadas > 0 ? ((rpt/prUsadas)*100).toFixed(1) : 0}% |\n`;
            r += `| 📐 **Calibraciones (CAL)** | **${cal}** | ${(cal * loteActivo.consumoPorPrueba).toFixed(2)} mL | ${prUsadas > 0 ? ((cal/prUsadas)*100).toFixed(1) : 0}% |\n`;
            r += `| 🎛️ **Controles de Calidad (QC)** | **${qc}** | ${(qc * loteActivo.consumoPorPrueba).toFixed(2)} mL | ${prUsadas > 0 ? ((qc/prUsadas)*100).toFixed(1) : 0}% |\n`;
            r += `| **TOTAL** | **${prUsadas}** | **${mlUsados.toFixed(2)} mL** | **100%** |\n\n`;

            if (Object.keys(porDia).length > 0) {
                r += `#### 📅 Histórico Diario de Pruebas Corridas con este Lote:\n`;
                r += `| Fecha | Pruebas Corridas | Volumen Debitador | Rutina Pacientes | Repeticiones | QC / Controles |\n`;
                r += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;
                Object.keys(porDia).sort().reverse().forEach(fecha => {
                    const d = porDia[fecha];
                    r += `| **${fecha}** | **${d.count} pruebas** | ${(d.count * loteActivo.consumoPorPrueba).toFixed(2)} mL | ${d.pac} | ${d.rpt} | ${d.qc} |\n`;
                });
            }
        }

        return r;

    } catch (error) {
        console.error('[Agent Tool Error] obtenerReporteCompletoReactivo:', error);
        return `Hubo un error al generar el reporte del reactivo "${nombreReactivo}": ${error.message}`;
    }
};

// Herramienta 3: Reporte Integral de Seguimiento, Gestión y Control de Autoanalizadores
const obtenerReporteSeguimientoGestionControl = async ({ equipo = null } = {}) => {
    try {
        console.log('[Agent Tool] Ejecutando obtenerReporteSeguimientoGestionControl, filtro:', equipo);
        const cs = require('../../cajas/cajas.service.js');
        const data = await cs.getCajasLaboratorio();
        const cajas = data.cajasEnUso || [];
        const cerradas = data.cajasCerradas || [];

        const equiposMap = {
            'CM 260i': { titulo: '🔬 WINNER CM 260i (Bioquímica Clínica)', cajas: [] },
            'Mindray BS-230': { titulo: '🧪 MINDRAY BS-230 (Bioquímica y Pruebas Especiales)', cajas: [] },
            'Mindray CL-900i': { titulo: '⚡ MINDRAY CL-900i (Quimioluminiscencia / Hormonas)', cajas: [] },
            'Mindray BC 5380': { titulo: '🩸 MINDRAY BC 5380 (Hematología Automatizada 5-DIFF)', cajas: [] }
        };

        cajas.forEach(c => {
            let eq = c.equipoAsociado || '';
            if (eq.includes('5380') || eq.includes('BC')) equiposMap['Mindray BC 5380'].cajas.push(c);
            else if (eq.includes('CL-900') || eq.includes('CL 900') || eq.includes('CLIA')) equiposMap['Mindray CL-900i'].cajas.push(c);
            else if (eq.includes('BS-230') || eq.includes('BS 230')) equiposMap['Mindray BS-230'].cajas.push(c);
            else equiposMap['CM 260i'].cajas.push(c);
        });

        const totalEnUso = cajas.length;
        const totalHoy = cajas.reduce((sum, c) => sum + (Number(c.pruebasConsumidasHoy) || 0), 0);
        const totalCriticos = cajas.filter(c => Number(c.porcentajeRestante) <= 20).length;
        const totalOptimos = cajas.filter(c => Number(c.porcentajeRestante) > 50).length;
        const totalEnNevera = cerradas.length;

        let r = `### 📊 REPORTE OFICIAL DE SEGUIMIENTO, GESTIÓN Y CONTROL DE AUTOANALIZADORES\n\n`;
        r += `> **LIMS CONTROLAB IA — Panel Ejecutivo de Monitoreo en Tiempo Real**\n`;
        r += `> *Fecha y Hora de Emisión:* **${new Date().toLocaleString('es-VE')}**\n\n`;

        r += `#### 📈 1. Resumen Ejecutivo de Operación y Stock\n`;
        r += `* 🟢 **Reactivos Operando en Analizadores:** **${totalEnUso} activos**\n`;
        r += `* ⚡ **Determinaciones / Pruebas Procesadas Hoy:** **${totalHoy} corridas**\n`;
        r += `* 🧊 **Cajas de Respaldo en Nevera (Laboratorio):** **${totalEnNevera} cajas cerradas**\n`;
        r += `* 🚦 **Semáforo de Disponibilidad:** **${totalOptimos} en Nivel Óptimo** (>50%) | **${totalCriticos} en Nivel Crítico** (≤20% reposición)\n\n`;
        r += `---\n\n`;

        r += `#### 📋 2. Desglose Detallado por Autoanalizador y Pruebas Mapeadas\n\n`;

        for (const [key, eqObj] of Object.entries(equiposMap)) {
            if (equipo && !key.toLowerCase().includes(equipo.toLowerCase())) {
                continue;
            }

            r += `### ${eqObj.titulo}\n`;
            if (eqObj.cajas.length === 0) {
                r += `*No hay reactivos activos en carrusel actualmente (Cajas en espera o respaldo en nevera).*\n\n`;
                continue;
            }

            r += `| Reactivo / Prueba | Lote Activo | Frasco | Pruebas Rest. | Vol. Rest. | Consumo Hoy | Total Caja | Nivel | Alerta |\n`;
            r += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

            eqObj.cajas.forEach(c => {
                const pct = Number(c.porcentajeRestante) || 0;
                let semaforo = '🟢 Óptimo';
                if (pct < 0) semaforo = '🟣 Excedente';
                else if (pct <= 20) semaforo = '🔴 Crítico';
                else if (pct <= 50) semaforo = '🟡 Medio';

                const frascoStr = `F${c.frascoActual || 1}/${c.totalFrascos || 1}`;
                const volStr = `${Number(c.mlRestantesFrasco || 0).toFixed(1)} mL`;
                const restPrStr = `${c.pruebasRestantesCaja} pr`;
                const hoyStr = `**${c.pruebasConsumidasHoy || 0}**`;
                const totalStr = `${c.pruebasConsumidasTotal || 0} pr`;

                r += `| **${c.productoNombre}** | \`${c.numeroLote}\` | ${frascoStr} | ${restPrStr} | ${volStr} | ${hoyStr} | ${totalStr} | ${pct}% | ${semaforo} |\n`;
            });
            r += `\n`;
        }

        // 3. Histórico de Actividad Diaria Reciente en Analizadores
        const logsHist = await prisma.logSniffer.findMany({
            where: {
                fecha_registro: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            },
            select: {
                fecha_registro: true,
                equipo_origen: true,
                is_qc: true,
                is_repeticion: true,
                is_calibracion: true
            },
            orderBy: { fecha_registro: 'desc' }
        });

        const diasMap = {};
        logsHist.forEach(l => {
            const dStr = l.fecha_registro ? l.fecha_registro.toISOString().split('T')[0] : 'N/D';
            if (!diasMap[dStr]) diasMap[dStr] = { total: 0, pac: 0, rep: 0, qc: 0, cal: 0 };
            diasMap[dStr].total++;
            if (l.is_repeticion) diasMap[dStr].rep++;
            else if (l.is_qc) diasMap[dStr].qc++;
            else if (l.is_calibracion) diasMap[dStr].cal++;
            else diasMap[dStr].pac++;
        });

        r += `#### 📅 3. Histórico Consolidado de Determinaciones por Día (Red de Analizadores)\n\n`;
        r += `| Fecha | Pruebas Totales | Pacientes (Rutina) | Repeticiones (RPT) | Controles / Calibración | Estatus Operativo |\n`;
        r += `| :---: | :---: | :---: | :---: | :---: | :---: |\n`;

        const fechasHist = Object.keys(diasMap).sort().reverse();
        if (fechasHist.length === 0) {
            r += `| *Sin registros recientes* | 0 | 0 | 0 | 0 | - |\n`;
        } else {
            fechasHist.forEach(f => {
                const itemD = diasMap[f];
                r += `| **${f}** | **${itemD.total}** | ${itemD.pac} | ${itemD.rep} | ${itemD.qc + itemD.cal} | 🟢 Procesado |\n`;
            });
        }
        r += `\n---\n\n`;
        r += `💡 *Regla Operativa:* Para auditar el historial día a día específico de una caja o frasco individual, escribe el nombre del reactivo (ej: *Reporte de Creatina*, *Reporte de HDL*, *Reporte de Glicemia*, *Reporte de Lipasa*).\n`;

        return r;
    } catch (error) {
        console.error('[Agent Tool Error] obtenerReporteSeguimientoGestionControl:', error);
        return `Hubo un error al generar el reporte de seguimiento: ${error.message}`;
    }
};


// Herramienta Especial: Reporte Consolidado de Lisantes de Hematología (Mindray BC 5380)
const obtenerReporteLisantesHematologia = async () => {
    try {
        console.log('[Agent Tool] Ejecutando obtenerReporteLisantesHematologia');
        const items = await prisma.itemInventario.findMany({
            where: {
                id: { in: [18003, 18004, 18005, 18013] }
            },
            include: {
                LotesReactivos: {
                    where: { estado_transferencia: 'RECIBIDO_LABORATORIO' },
                    orderBy: { Id: 'desc' }
                }
            }
        });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const logsToday = await prisma.logSniffer.count({
            where: {
                lote_afectado_id: { in: [48339, 48340, 48341, 48396] },
                fecha_registro: { gte: startOfDay }
            }
        });

        let r = `### 🩸 REPORTE CONSOLIDADO DE LISANTES Y DILUENTE — MINDRAY BC 5380\n\n`;
        r += `> **LIMS CONTROLAB IA — Panel de Monitoreo de Hematología Automatizada 5-DIFF**\n`;
        r += `> *Fecha de emisión:* **${new Date().toLocaleString('es-VE')}**\n\n`;

        r += `| Reactivo / Lisante | Color Tapa | Presentación | Lote Activo | Restante (mL) | Pruebas Restantes | Estatus | Pruebas Hoy |\n`;
        r += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

        for (const it of items) {
            const activeLot = it.LotesReactivos.find(l => l.Estado === 'Activo') || it.LotesReactivos[0];
            const stockLab = await prisma.stockPorAlmacen.findUnique({
                where: { item_id_almacen_id: { item_id: it.id, almacen_id: 2 } }
            });
            const cantLab = stockLab ? Number(stockLab.stock_actual) : 1;

            let colorTapa = '⚪ Blanca';
            if (it.nombre.includes('VERDE')) colorTapa = '🟢 Verde';
            else if (it.nombre.includes('ROJA')) colorTapa = '🔴 Roja';
            else if (it.nombre.includes('NEGRA')) colorTapa = '⚫ Negra';
            else if (it.nombre.includes('DILUENTE')) colorTapa = '🔵 Bidón 20L';

            const volRest = activeLot ? Number(activeLot.CantidadActual).toFixed(1) : Number(it.volumen_total_caja).toFixed(1);
            const dosis = Number(it.consumo_indicado) || 1;
            const prRest = Math.floor(Number(volRest) / dosis);

            let semaforo = '🟢 Óptimo';
            if (prRest <= 100) semaforo = '🔴 Crítico';
            else if (prRest <= 300) semaforo = '🟡 Medio';

            r += `| **${it.nombre}** | ${colorTapa} | ${it.presentacion} | \`${activeLot ? activeLot.NumeroLote : '1'}\` | **${volRest} mL** | **${prRest} pr** | ${semaforo} | **${logsToday}** |\n`;
        }

        r += `\n---\
\n`;
        r += `#### 📦 Situación de Cajas y Transferencias en Laboratorio:\n`;
        r += `* 🔬 **Cajas Activas en Carrusel (Laboratorio):** Cada lisante tiene activa su caja **Lote 1** en el Centro de Reactivos realizando los descuentos en vivo por corrida del BC 5380.\n`;
        r += `* 🚚 **Cajas Físicas en Proceso de Recepción:** Las 4 cajas transferidas desde Almacén Central (Lotes Oficiales: '2025120251', '2026030951', '2025060951', '2026061051') se encuentran listas para confirmación electrónica en la pantalla de **Recepción de Laboratorio**.\n`;
        r += `* 💡 *Nota Operativa:* Al ser aceptadas en el módulo de recepción, se sumarán de respaldo a la nevera sin interrumpir el frasco activo en uso.\n`;

        return r;
    } catch (e) {
        console.error('[Agent Tool Error] obtenerReporteLisantesHematologia:', e);
        return `Error generando reporte de lisantes: ${e.message}`;
    }
};

const snifferToolsDeclarations = [
    {
        name: "obtenerReporteSeguimientoGestionControl",
        description: "Obtiene el reporte oficial de seguimiento, gestión y control de autoanalizadores (CM 260i, Mindray BS-230, Mindray CL-900i, Mindray BC 5380), con reactivos activos, frascos, pruebas consumidas hoy, pruebas restantes y semáforo de disponibilidad.",
        parameters: {
            type: "object",
            properties: {
                equipo: {
                    type: "string",
                    description: "Nombre del autoanalizador a filtrar (ej: CM 260i, BS-230, CL-900i, BC 5380). Si se omite, muestra todos."
                }
            }
        }
    },
    {
        name: "obtenerReporteDiarioSniffer",
        description: "Obtiene un reporte ejecutivo diario de las pruebas, controles de calidad y repeticiones detectadas por el Sniffer en la red de analizadores.",
        parameters: {
            type: "object",
            properties: {
                fecha: {
                    type: "string",
                    description: "Fecha para el reporte en formato YYYY-MM-DD. Si no se provee, usa la fecha de hoy."
                }
            }
        }
    },
    {
        name: "obtenerReporteCompletoReactivo",
        description: "Obtiene un reporte técnico consolidado y completo de cualquier reactivo del catálogo, mostrando balance de caja (capacidad, consumido, restante), frascos en uso/sellados, desglose por tipo de corrida (paciente, qc, calibración, repetición) e histórico diario.",
        parameters: {
            type: "object",
            properties: {
                nombreReactivo: {
                    type: "string",
                    description: "Nombre o código del reactivo a consultar (ej: Urea, Colesterol, Calcio, TSH, Glicemia, Triglicéridos, Creatinina, ALT, AST, Bilirrubina, etc.)."
                }
            },
            required: ["nombreReactivo"]
        }
    }
];

// Herramienta 4: Reporte de Días y Autonomía de Reactivos del Centro de Control
const obtenerReporteDiasCentroReactivos = async () => {
    try {
        console.log('[Agent Tool] Ejecutando obtenerReporteDiasCentroReactivos');
        const cs = require('../../cajas/cajas.service.js');
        const data = await cs.getCajasLaboratorio();
        const cajas = data.cajasEnUso || [];

        const now = new Date();

        const equiposMap = {
            'CM 260i': { titulo: '🔬 WINNER CM 260i (Bioquímica Clínica)', cajas: [] },
            'Mindray BS-230': { titulo: '🧪 MINDRAY BS-230 (Bioquímica y Pruebas Especiales)', cajas: [] },
            'Mindray CL-900i': { titulo: '⚡ MINDRAY CL-900i (Quimioluminiscencia / Hormonas)', cajas: [] },
            'Mindray BC 5380': { titulo: '🩸 MINDRAY BC 5380 (Hematología Automatizada 5-DIFF)', cajas: [] }
        };

        cajas.forEach(c => {
            let eq = c.equipoAsociado || '';
            if (eq.includes('5380') || eq.includes('BC')) equiposMap['Mindray BC 5380'].cajas.push(c);
            else if (eq.includes('CL-900') || eq.includes('CL 900') || eq.includes('CLIA')) equiposMap['Mindray CL-900i'].cajas.push(c);
            else if (eq.includes('BS-230') || eq.includes('BS 230')) equiposMap['Mindray BS-230'].cajas.push(c);
            else equiposMap['CM 260i'].cajas.push(c);
        });

        let r = '### 🗓️ REPORTE TÉCNICO DE DÍAS Y AUTONOMÍA — CENTRO DE CONTROL DE REACTIVOS\n\n';
        r += '> **LIMS CONTROLAB IA — Monitor de Estabilidad, Días en Uso y Cobertura Operativa**\n';
        r += `> *Fecha de Emisión:* **${now.toLocaleString('es-VE')}** | **75 Reactivos Activos en Analizadores**\n\n`;

        r += 'Este informe desglosa para cada reactivo montado en el carrusel:\n';
        r += '1. **Días Abierto:** Días transcurridos desde que el bioanalista abrió la caja y montó el reactivo.\n';
        r += '2. **Días para Vencer:** Días restantes según la fecha de caducidad oficial del lote.\n';
        r += '3. **Días de Autonomía:** Proyección de cobertura según pruebas restantes y consumo promedio.\n\n';
        r += '---\n\n';

        for (const [key, eqObj] of Object.entries(equiposMap)) {
            r += `### ${eqObj.titulo} (${eqObj.cajas.length} reactivos en uso)\n\n`;
            if (eqObj.cajas.length === 0) {
                r += '*Sin reactivos activos en este analizador actualmente.*\n\n';
                continue;
            }

            r += '| Reactivo / Determinación | Lote | Frasco | Pruebas Rest. | Días Abierto | Días p/Vencer | Autonomía Est. | Estatus |\n';
            r += '| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n';

            eqObj.cajas.forEach(c => {
                let diasAbierto = 0;
                if (c.fechaApertura) {
                    diasAbierto = Math.max(0, Math.floor((now - new Date(c.fechaApertura)) / (1000 * 60 * 60 * 24)));
                }

                let diasVencer = 'N/D';
                let estatusVenc = '🟢 Vigente';
                if (c.fechaVencimiento) {
                    const diff = Math.floor((new Date(c.fechaVencimiento) - now) / (1000 * 60 * 60 * 24));
                    diasVencer = `${diff} d`;
                    if (diff < 0) estatusVenc = '🔴 Vencido';
                    else if (diff <= 30) estatusVenc = '🟡 Por vencer';
                }

                const hoy = c.pruebasConsumidasHoy || 0;
                let autonomia = 'Estable (>30 d)';
                if (hoy > 0) {
                    autonomia = `${(c.pruebasRestantesCaja / hoy).toFixed(1)} d`;
                } else if (c.pruebasRestantesCaja <= 0) {
                    autonomia = '0 d (Agotado)';
                }

                const frascoStr = `F${c.frascoActual || 1}/${c.totalFrascos || 1}`;

                r += `| **${c.productoNombre}** | \`${c.numeroLote}\` | ${frascoStr} | ${c.pruebasRestantesCaja} pr | **${diasAbierto} días** | ${diasVencer} | ${autonomia} | ${estatusVenc} |\n`;
            });
            r += '\n';
        }

        r += '---\n\n';
        r += '💡 *Nota Operativa:* Los días abiertos reflejan el tiempo de permanencia en el analizador/laboratorio para control de estabilidad en refrigeración y a bordo.';
        return r;
    } catch (error) {
        console.error('[Agent Tool Error] obtenerReporteDiasCentroReactivos:', error);
        return `Error al generar el reporte de días: ${error.message}`;
    }
};

const snifferToolsFunctions = {
    obtenerReporteDiasCentroReactivos,
    obtenerReporteLisantesHematologia,
    obtenerReporteSeguimientoGestionControl,
    obtenerReporteDiarioSniffer,
    obtenerReporteCompletoReactivo
};


module.exports = {
    snifferToolsDeclarations,
    snifferToolsFunctions
};
