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

// Herramienta 2: Reporte Consolidado Universal de Reactivo por Lote y Caja (Universal para todo el catálogo)
const obtenerReporteCompletoReactivo = async ({ nombreReactivo }) => {
    try {
        console.log(`[Agent Tool] Ejecutando obtenerReporteCompletoReactivo para: ${nombreReactivo}`);
        const busqueda = (nombreReactivo || '').trim();

        if (!busqueda) {
            return "Por favor especifica el nombre o código del reactivo (ej: Urea, Colesterol, Calcio, Glicemia).";
        }

        const cleanBusqueda = busqueda.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // 1. Buscar en mapeo_pruebas_reactivos
        const mapeos = await prisma.mapeo_pruebas_reactivos.findMany();
        const mappedItemIds = mapeos
            .filter(m => {
                const np = (m.nombre_prueba || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const pb = (m.patron_busqueda || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return np.includes(cleanBusqueda) || pb.includes(cleanBusqueda) || cleanBusqueda.includes(np);
            })
            .map(m => m.reactivo_id);

        // 2. Buscar en items_inventario
        const allItems = await prisma.itemInventario.findMany();
        let targetItems = allItems.filter(i => {
            const nom = (i.nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const cod = (i.codigo || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const ref = (i.referencia_abreviada || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return mappedItemIds.includes(i.id) || nom.includes(cleanBusqueda) || cod.includes(cleanBusqueda) || ref.includes(cleanBusqueda) || cleanBusqueda.includes(nom);
        });

        if (!targetItems || targetItems.length === 0) {
            return `No se encontró ningún reactivo en el catálogo que coincida con "${busqueda}".`;
        }

        const targetItemIds = targetItems.map(i => i.id);

        // 3. Buscar lotes asociados estrictamente a estos items
        const lotes = await prisma.lotesReactivos.findMany({
            where: { InventarioId: { in: targetItemIds } },
            include: { items_inventario: true },
            orderBy: { Id: 'desc' }
        });

        let lote = null;
        let item = null;

        if (lotes && lotes.length > 0) {
            let maxCount = -1;
            lote = lotes[0];

            for (const candidateLote of lotes) {
                const count = await prisma.logSniffer.count({
                    where: { lote_afectado_id: candidateLote.Id }
                });
                if (count > maxCount) {
                    maxCount = count;
                    lote = candidateLote;
                }
            }
            item = lote.items_inventario;
        } else {
            item = targetItems[0];
        }

        let meta = {};
        if (lote && lote.CondicionesEspeciales && lote.CondicionesEspeciales.startsWith('{')) {
            try {
                meta = JSON.parse(lote.CondicionesEspeciales);
            } catch (_) {}
        }

        const totalFrascos = Number(meta.total_frascos || item.frascos_por_caja) || 4;
        const volPorFrasco = Number(meta.vol_por_frasco || item.volumen_por_frasco) || 45;
        const consumoPorPrueba = Number(meta.consumo_indicado || item.consumo_indicado) || 0.25;

        const totalVolCaja = totalFrascos * volPorFrasco;
        const totalPruebasTeoricas = Math.floor(totalVolCaja / consumoPorPrueba);

        // 4. Obtener consumos de log_sniffer
        let logs = [];
        if (lote) {
            logs = await prisma.logSniffer.findMany({
                where: { lote_afectado_id: lote.Id },
                orderBy: { id: 'desc' }
            });
        }

        const pruebasConsumidas = logs.length;
        const mlConsumidos = pruebasConsumidas * consumoPorPrueba;

        const mlRestantesCaja = Math.max(0, totalVolCaja - mlConsumidos);
        const pruebasRestantesCaja = Math.floor(mlRestantesCaja / consumoPorPrueba);

        const pctConsumido = totalVolCaja > 0 ? ((mlConsumidos / totalVolCaja) * 100).toFixed(1) : 0;
        const pctRestante = totalVolCaja > 0 ? ((mlRestantesCaja / totalVolCaja) * 100).toFixed(1) : 0;

        const frascoCalculado = Math.min(totalFrascos, Math.floor(mlConsumidos / volPorFrasco) + 1);
        const frascoActual = Math.max(Number(meta.frasco_actual) || 1, frascoCalculado);

        let pacCount = 0, qcCount = 0, calCount = 0, repCount = 0;
        const porDia = {};

        logs.forEach(l => {
            const ml = Number(l.ml_descontados) || consumoPorPrueba;
            const fechaStr = new Date(l.fecha_registro).toISOString().split('T')[0];

            if (!porDia[fechaStr]) {
                porDia[fechaStr] = { count: 0, ml: 0, pac: 0, qc: 0, cal: 0, rep: 0 };
            }
            porDia[fechaStr].count += 1;
            porDia[fechaStr].ml += ml;

            if (l.is_qc) {
                qcCount++;
                porDia[fechaStr].qc++;
            } else if (l.is_calibracion) {
                calCount++;
                porDia[fechaStr].cal++;
            } else if (l.is_repeticion) {
                repCount++;
                porDia[fechaStr].rep++;
            } else {
                pacCount++;
                porDia[fechaStr].pac++;
            }
        });

        let r = `### 📦 Informe Consolidado y Balance de Capacidad de la Caja: *${item.nombre}*\n\n`;
        r += `---\n\n`;
        r += `### 📦 1. Balance de la Caja (Capacidad Total vs. Consumo Real)\n\n`;
        r += `* **Producto:** *${item.nombre}*\n`;
        r += `* **Lote:** \`${lote ? lote.NumeroLote : 'Sin Apertura Aún'}\` ${lote ? `(ID: \`${lote.Id}\`)` : ''} | **Presentación:** \`${totalFrascos} frascos x ${volPorFrasco} mL\`\n`;
        r += `* **Dosis por prueba:** \`${consumoPorPrueba} mL\` por determinación.\n\n`;
        r += `| Concepto | Volumen (mL) | Pruebas / Determinaciones | Porcentaje | Estatus |\n`;
        r += `| :--- | :---: | :---: | :---: | :---: |\n`;
        r += `| 📦 **Capacidad Total de la Caja** | **\`${totalVolCaja.toFixed(2)} mL\`** | **\`${totalPruebasTeoricas} pruebas teóricas\`** | **100%** | Caja Completa |\n`;
        r += `| ⚡ **Consumo Total Acumulado** | **\`${mlConsumidos.toFixed(2)} mL\`** | **\`${pruebasConsumidas} pruebas\`** | **${pctConsumido}%** | **Consumido** |\n`;
        r += `| 🟢 **Restante Disponible en Caja** | **\`${mlRestantesCaja.toFixed(2)} mL\`** | **\`${pruebasRestantesCaja} pruebas\`** | **${pctRestante}%** | **Disponible** |\n\n`;

        r += `#### 🧪 Desglose por Frasco de la Caja:\n`;
        for (let f = 1; f <= totalFrascos; f++) {
            if (f < frascoActual) {
                r += `* 🔴 **Frasco ${f} (${volPorFrasco} mL):** **\`AGOTADO\`** (Consumió ${Math.floor(volPorFrasco / consumoPorPrueba)} pruebas / ${volPorFrasco} mL).\n`;
            } else if (f === frascoActual) {
                const mlUsadosEnEsteFrasco = mlConsumidos - ((f - 1) * volPorFrasco);
                const mlQuedanEsteFrasco = Math.max(0, volPorFrasco - mlUsadosEnEsteFrasco);
                const prUsadas = Math.floor(mlUsadosEnEsteFrasco / consumoPorPrueba);
                const prQuedan = Math.floor(mlQuedanEsteFrasco / consumoPorPrueba);
                r += `* 🟢 **Frasco ${f} (${volPorFrasco} mL):** **\`EN USO ACTUAL\`** (Consumidas **${prUsadas} pruebas** / ${mlUsadosEnEsteFrasco.toFixed(2)} mL | **Quedan ${prQuedan} pruebas / ${mlQuedanEsteFrasco.toFixed(2)} mL**).\n`;
            } else {
                r += `* ⚪ **Frasco ${f} (${volPorFrasco} mL):** **\`SELLADO\`** (Intacto: ${Math.floor(volPorFrasco / consumoPorPrueba)} pruebas / ${volPorFrasco} mL).\n`;
            }
        }

        r += `\n---\n\n`;
        r += `### 🔍 2. Desglose de Pruebas Descontadas por Tipo de Corrida\n\n`;
        r += `| Categoría | Pruebas Descontadas | Volumen Descontado | Porcentaje del Consumo |\n`;
        r += `| :--- | :---: | :---: | :---: |\n`;
        const pctPac = pruebasConsumidas > 0 ? ((pacCount / pruebasConsumidas) * 100).toFixed(1) : 0;
        const pctRep = pruebasConsumidas > 0 ? ((repCount / pruebasConsumidas) * 100).toFixed(1) : 0;
        const pctCal = pruebasConsumidas > 0 ? ((calCount / pruebasConsumidas) * 100).toFixed(1) : 0;
        const pctQc  = pruebasConsumidas > 0 ? ((qcCount / pruebasConsumidas) * 100).toFixed(1) : 0;

        r += `| 🧪 **Pruebas de Rutina (Pacientes)** | **${pacCount}** | **${(pacCount * consumoPorPrueba).toFixed(2)} mL** | **${pctPac}%** |\n`;
        r += `| 🔄 **Repeticiones (RPT)** | **${repCount}** | **${(repCount * consumoPorPrueba).toFixed(2)} mL** | **${pctRep}%** |\n`;
        r += `| 📐 **Calibraciones (CAL)** | **${calCount}** | **${(calCount * consumoPorPrueba).toFixed(2)} mL** | **${pctCal}%** |\n`;
        r += `| 🎛️ **Controles de Calidad (QC)** | **${qcCount}** | **${(qcCount * consumoPorPrueba).toFixed(2)} mL** | **${pctQc}%** |\n`;
        r += `| **TOTAL** | **${pruebasConsumidas}** | **${mlConsumidos.toFixed(2)} mL** | **100%** |\n\n`;

        r += `---\n\n`;
        r += `### 📅 3. Histórico de Consumo por Día\n\n`;
        r += `| Fecha | Pruebas Totales | Volumen Descontado | Pacientes | Repeticiones | Calibraciones | QC |\n`;
        r += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

        const fechasOrdenadas = Object.keys(porDia).sort().reverse();
        if (fechasOrdenadas.length === 0) {
            r += `| *Sin consumos registrados aún* | 0 | 0.00 mL | 0 | 0 | 0 | 0 |\n`;
        } else {
            fechasOrdenadas.slice(0, 15).forEach(f => {
                const d = porDia[f];
                r += `| **${f}** | **${d.count}** | **${d.ml.toFixed(2)} mL** | ${d.pac} | ${d.rep} | ${d.cal} | ${d.qc} |\n`;
            });
        }

        return r;

    } catch (error) {
        console.error('[Agent Tool Error] obtenerReporteCompletoReactivo:', error);
        return `Hubo un error al generar el reporte del reactivo "${nombreReactivo}": ${error.message}`;
    }
};

const snifferToolsDeclarations = [
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

const snifferToolsFunctions = {
    obtenerReporteDiarioSniffer,
    obtenerReporteCompletoReactivo
};

module.exports = {
    snifferToolsDeclarations,
    snifferToolsFunctions
};
