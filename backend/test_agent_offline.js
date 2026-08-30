const offlineHandler = require('./src/modules/agent/offlineHandler');

async function testPrompt() {
  const p1 = await offlineHandler.handleOfflinePrompt("dame los reactivos con stock maximo");
  console.log("Con maximo (sin acento):", !!p1);
  
  const p2 = await offlineHandler.handleOfflinePrompt("dame los reactivos con stock máximo");
  console.log("Con máximo (con acento):", !!p2);

  const p3 = await offlineHandler.handleOfflinePrompt("calcula los margenes de ganancia");
  console.log("Con margenes (sin acento):", !!p3);

  const p4 = await offlineHandler.handleOfflinePrompt("calcula los márgenes de ganancia");
  console.log("Con márgenes (con acento):", !!p4);
  
  const p5 = await offlineHandler.handleOfflinePrompt("promedio de dias en almacen");
  console.log("Con dias/almacen (sin acento):", !!p5);

  const p6 = await offlineHandler.handleOfflinePrompt("promedio de días en almacén");
  console.log("Con días/almacén (con acento):", !!p6);
}
testPrompt();
