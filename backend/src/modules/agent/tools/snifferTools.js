const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Herramienta 1: Reporte Diario de Sniffer
const obtenerReporteDiarioSniffer = async ({ fecha }) => {
    try {
        console.log(`[Agent Tool] Ejecutando obtenerReporteDiarioSniffer para la fecha: ${fecha}`);

        // Parsear la fecha o buscar el último día activo
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
            // Buscar la fecha del último log registrado
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
    }
];

const snifferToolsFunctions = {
    obtenerReporteDiarioSniffer
};

module.exports = {
    snifferToolsDeclarations,
    snifferToolsFunctions
};
