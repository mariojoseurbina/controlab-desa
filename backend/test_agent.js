const agentService = require('./src/modules/agent/agent.service');

async function test() {
  try {
    const prompt = "Calcula el punto de equilibrio mensual: ¿cuántas pruebas debemos realizar para cubrir nuestros costos fijos?";
    console.log("Sending prompt:", prompt);
    const result = await agentService.processChat(prompt);
    console.log("Success:", result);
  } catch (error) {
    console.error("Error occurred:", error);
    console.error(error.stack);
  }
}

test();
