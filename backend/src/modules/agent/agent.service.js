const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const inventoryTools = require('./tools/inventoryTools');
const costTools = require('./tools/costTools');
const snifferTools = require('./tools/snifferTools');
require('dotenv').config();

// Inicializa el SDK de Gemini
let ai;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'pega_tu_clave_de_gemini_aqui') {
  ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Mapeo de Herramientas para Gemini (Function Declarations)
const systemTools = [{
  functionDeclarations: [
    {
      name: "checkInventory",
      description: "Obtiene un resumen de los items del inventario. Puede filtrar por stock bajo o por categoría.",
      parameters: {
        type: "OBJECT",
        properties: {
          filterLowStock: { type: "BOOLEAN", description: "Si es true, solo devuelve items cuyo stock actual es menor o igual a su stock mínimo." },
          category: { type: "STRING", description: "Opcional. El nombre de la categoría para filtrar." }
        }
      }
    },
    {
      name: "checkExpiringLots",
      description: "Consulta los lotes de reactivos que están próximos a vencer o ya vencieron.",
      parameters: {
        type: "OBJECT",
        properties: {
          daysUntilExpiration: { type: "INTEGER", description: "Cantidad de días hacia el futuro para verificar vencimientos. Por defecto es 30." }
        }
      }
    },
    {
      name: "checkRecentPurchases",
      description: "Obtiene un historial de las compras de inventario más recientes.",
      parameters: {
        type: "OBJECT",
        properties: {
          limit: { type: "INTEGER", description: "Cantidad máxima de registros a devolver. Por defecto es 5." },
          proveedorName: { type: "STRING", description: "Opcional. Nombre del proveedor para filtrar." }
        }
      }
    },
    {
      name: "checkConsumptionRate",
      description: "Calcula el ritmo de consumo diario y proyecta los días de autonomía del inventario.",
      parameters: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING", description: "Opcional. Categoría a filtrar (ej. 'Hematología', 'Química')." },
          days: { type: "INTEGER", description: "Cantidad de días hacia atrás a evaluar. Por defecto 30." }
        }
      }
    },
    {
      name: "checkDiscrepancies",
      description: "Analiza discrepancias y mermas comparando el volumen teórico restante contra el físico real en los lotes activos."
    },
    {
      name: "checkExpiringFinancialLoss",
      description: "Calcula la pérdida económica estimada por los lotes de reactivos vencidos o próximos a vencer."
    },
    {
      name: "checkExpiredActiveLots",
      description: "Detecta lotes cuya fecha de vencimiento ya pasó pero que siguen marcados como 'Activos' en el sistema."
    },
    {
      name: "checkShrinkageCauses",
      description: "Analiza los movimientos de inventario para desglosar y agrupar las causas de las mermas (vencimiento, daño, etc)."
    },
    {
      name: "checkAverageStorageDays",
      description: "Calcula el promedio histórico de días que los reactivos pasan almacenados en inventario antes de agotarse."
    },
    {
      name: "checkPriceVariation",
      description: "Escanéa el historial de compras para detectar inflación y variaciones de precio en los reactivos a lo largo del tiempo."
    },
    {
      name: "checkSupplierPerformance",
      description: "Evalúa a los proveedores calculando el gasto histórico total y el promedio de días de retraso en sus entregas."
    },
    {
      name: "checkPendingPurchases",
      description: "Busca las compras que siguen en estado 'Pendiente' y calcula los días que han pasado desde la solicitud."
    },
    {
      name: "calculateTestMargins",
      description: "Calcula los márgenes de ganancia, costos reales por prueba y ordena cuáles dejan mayor o menor rentabilidad."
    },
    {
      name: "calculateGlobalExpenses",
      description: "Calcula los porcentajes de gastos mensuales globales (gastos administrativos vs nómina de personal)."
    },
    {
      name: "simulatePriceImpact",
      description: "Simula cómo impactará en los costos si un proveedor sube el precio de un consumible.",
      parameters: {
        type: "OBJECT",
        properties: {
          consumibleName: { type: "STRING", description: "Nombre del consumible a simular (ej. 'tubos de ensayo')." },
          percentageIncrease: { type: "INTEGER", description: "Porcentaje de incremento de precio (ej. 10)." }
        },
        required: ["consumibleName", "percentageIncrease"]
      }
    },
    {
      name: "compareEquipmentCosts",
      description: "Compara el costo de mantenimiento (soluciones, calibradores, controles) entre los diferentes equipos."
    },
    {
      name: "calculateWasteCost",
      description: "Calcula la pérdida financiera estimada por mermas y desperdicios."
    },
    {
      name: "calculateBreakEvenPoint",
      description: "Calcula el punto de equilibrio: cuántas pruebas se deben realizar al mes para cubrir los costos fijos."
    },
    {
      name: "checkExpensiveLowVolumeReagents",
      description: "Busca reactivos muy costosos usados en pruebas con bajo margen de rentabilidad."
    },
    {
      name: "checkInventoryValue",
      description: "Calcula el valor financiero total del inventario inmovilizado y desglosado por categorías."
    },
    {
      name: "getTopConsumptions",
      description: "Analiza tendencias de consumo, detecta incrementos inusuales y muestra los ítems que más rápido se agotan.",
      parameters: {
        type: "OBJECT",
        properties: {
          days: { type: "INTEGER", description: "Cantidad de días a evaluar (ej. 7 o 30)." },
          limit: { type: "INTEGER", description: "Cantidad máxima de ítems a retornar (ej. 5)." }
        }
      }
    },
    {
      name: "checkOverstock",
      description: "Detecta reactivos y consumibles cuyo stock actual supera el stock máximo permitido (sobrecompra)."
    },
    {
      name: "checkInventoryProportions",
      description: "Calcula la proporción y porcentajes del inventario distribuidos por categoría."
    },
    ...snifferTools.snifferToolsDeclarations
  ]
}];

const systemInstruction = `
Eres "Controlab Brain Agent", el asistente de inteligencia artificial exclusivo para el laboratorio clínico. ESTÁS CONECTADO DIRECTAMENTE A LA BASE DE DATOS.
Tu función principal es ayudar a los dueños y administradores a gestionar su inventario, reactivos, compras, costos financieros y auditoría de red.
Reglas Inquebrantables:
1. TIENES ACCESO TOTAL a la información mediante las herramientas proporcionadas. NUNCA digas "no tengo acceso" o "no puedo consultar".
2. SIEMPRE debes invocar las herramientas de forma automática.
3. Formatea tus respuestas finales usando Markdown.
4. Cuando des un reporte de mermas capturadas por el Sniffer, NUNCA menciones la palabra "Infolab" o ningún otro LIS, debes decir que las mermas fueron detectadas en la "red de analizadores".
`;

class AgentService {
  constructor() {
    this.model = 'gemini-flash-latest';
  }

  async processChat(prompt) {
    try {
      const OFFLINE_DEMO_MODE = true; // ACTIVADO PARA LA PRESENTACIÓN

      if (OFFLINE_DEMO_MODE) {
        console.log("[Agent] Modo Demostración Offline Activado. Procesando localmente...");
        const offlineHandler = require('./offlineHandler');
        const response = await offlineHandler.handleOfflinePrompt(prompt);
        
        if (response) {
            return response;
        }

        // RESPUESTA POR DEFECTO OFFLINE (Si no coincide con nada)
        return {
          respuesta: `¡Hola! Soy tu asistente **Controlab Brain**. Estoy conectado directamente a tu base de datos.\n\nPuedes preguntarme cualquiera de los 25 reportes programados para tu demostración (Inventario, Costos, Compras, Finanzas o Auditoría de Red).`,
          fuente: 'Controlab Brain'
        };
      }

      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'pega_tu_clave_de_gemini_aqui') {
        throw new Error("La clave GEMINI_API_KEY no está configurada correctamente en el archivo .env");
      }

      if (!ai) {
        ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      }

      const model = ai.getGenerativeModel({
        model: this.model,
        systemInstruction: systemInstruction,
        tools: systemTools,
        generationConfig: {
          temperature: 0.1,
        }
      });

      const chat = model.startChat();

      console.log("[Agent] Enviando prompt inicial a Gemini...");
      
      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await chat.sendMessage(prompt);
          break; // Success
        } catch (e) {
          if ((e.status === 503 || e.status === 429) && retries > 1) {
            console.log(`[Agent] Servidores de Google ocupados (Error ${e.status}). Reintentando en 3 segundos... Quedan ${retries - 1} intentos.`);
            await new Promise(r => setTimeout(r, 3000));
            retries--;
          } else {
            throw e;
          }
        }
      }

      // Bucle de herramientas (Tool Calling)
      let functionCalls = response && response.response ? response.response.functionCalls() : [];
      while (functionCalls && functionCalls.length > 0) {
        const toolResponses = [];

        for (const call of functionCalls) {
          const functionName = call.name;
          const args = call.args || {};
          let toolResult = {};

          console.log(`[Agent] Gemini solicitó ejecutar la herramienta: ${functionName}`);

          try {
            if (functionName === 'checkInventory') toolResult = await inventoryTools.checkInventory(args);
            else if (functionName === 'checkExpiringLots') toolResult = await inventoryTools.checkExpiringLots(args);
            else if (functionName === 'checkRecentPurchases') toolResult = await inventoryTools.checkRecentPurchases(args);
            else if (functionName === 'checkConsumptionRate') toolResult = await inventoryTools.checkConsumptionRate(args);
            else if (functionName === 'checkInventoryValue') toolResult = await inventoryTools.checkInventoryValue(args);
            else if (functionName === 'getTopConsumptions') toolResult = await inventoryTools.getTopConsumptions(args);
            else if (functionName === 'checkOverstock') toolResult = await inventoryTools.checkOverstock(args);
            else if (functionName === 'checkInventoryProportions') toolResult = await inventoryTools.checkInventoryProportions(args);
            else if (functionName === 'checkDiscrepancies') toolResult = await inventoryTools.checkDiscrepancies(args);
            else if (functionName === 'checkExpiringFinancialLoss') toolResult = await inventoryTools.checkExpiringFinancialLoss(args);
            else if (functionName === 'checkExpiredActiveLots') toolResult = await inventoryTools.checkExpiredActiveLots(args);
            else if (functionName === 'checkShrinkageCauses') toolResult = await inventoryTools.checkShrinkageCauses(args);
            else if (functionName === 'checkAverageStorageDays') toolResult = await inventoryTools.checkAverageStorageDays(args);
            else if (functionName === 'checkPriceVariation') toolResult = await inventoryTools.checkPriceVariation(args);
            else if (functionName === 'checkSupplierPerformance') toolResult = await inventoryTools.checkSupplierPerformance(args);
            else if (functionName === 'checkPendingPurchases') toolResult = await inventoryTools.checkPendingPurchases(args);
            else if (functionName === 'calculateTestMargins') toolResult = await costTools.calculateTestMargins(args);
            else if (functionName === 'calculateGlobalExpenses') toolResult = await costTools.calculateGlobalExpenses(args);
            else if (functionName === 'simulatePriceImpact') toolResult = await costTools.simulatePriceImpact(args);
            else if (functionName === 'compareEquipmentCosts') toolResult = await costTools.compareEquipmentCosts(args);
            else if (functionName === 'calculateWasteCost') toolResult = await costTools.calculateWasteCost(args);
            else if (functionName === 'calculateBreakEvenPoint') toolResult = await costTools.calculateBreakEvenPoint(args);
            else if (functionName === 'checkExpensiveLowVolumeReagents') toolResult = await costTools.checkExpensiveLowVolumeReagents(args);
            else if (functionName === 'obtenerReporteDiarioSniffer') toolResult = await snifferTools.snifferToolsFunctions.obtenerReporteDiarioSniffer(args);
            else toolResult = { error: `Herramienta ${functionName} no encontrada.` };
          } catch (toolError) {
            toolResult = { error: toolError.message };
          }

          // Truncado de seguridad para que el contexto no explote
          let safeToolResult = toolResult;
          if (Array.isArray(toolResult) && toolResult.length > 25) {
            safeToolResult = toolResult.slice(0, 25);
            safeToolResult.push({ meta_info: `Hay registros adicionales omitidos por seguridad.` });
          } else if (toolResult && toolResult.detalles && Array.isArray(toolResult.detalles) && toolResult.detalles.length > 25) {
            toolResult.detalles = toolResult.detalles.slice(0, 25);
            toolResult.meta_info = `Registros adicionales omitidos.`;
            safeToolResult = toolResult;
          }

          toolResponses.push({
            name: functionName,
            response: safeToolResult
          });
        }

        console.log(`[Agent] Devolviendo ${toolResponses.length} resultados de herramientas a Gemini...`);
        
        let retriesTool = 3;
        while (retriesTool > 0) {
          try {
            response = await chat.sendMessage(toolResponses.map(tr => ({
              functionResponse: {
                name: tr.name,
                response: { result: tr.response }
              }
            })));
            break;
          } catch (e) {
            if ((e.status === 503 || e.status === 429) && retriesTool > 1) {
              console.log(`[Agent] Servidores ocupados al enviar respuesta de herramienta (Error ${e.status}). Reintentando en 3s...`);
              await new Promise(r => setTimeout(r, 3000));
              retriesTool--;
            } else {
              throw e;
            }
          }
        }
        functionCalls = response && response.response ? response.response.functionCalls() : [];
      }

      return {
        respuesta: response.response.text(),
        fuente: 'Controlab Brain Agent (Google Gemini 1.5 Flash)'
      };
    } catch (error) {
      console.error("Error en AgentService (Gemini):", error);
      throw error;
    }
  }
}

module.exports = new AgentService();
