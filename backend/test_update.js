const inventoryService = require('./services/inventoryService');

async function run() {
  try {
    const items = await inventoryService.getAllItems();
    console.log("Items encontrados:", items.length);
    if (items.length > 0) {
      const item = items[0];
      console.log("Probando updateItem en item ID:", item.id);
      const res = await inventoryService.updateItem(item.id, {
        ...item,
        volumen_muerto_residual: "2,5",
        consumo_indicado: "0,25"
      }, 1);
      console.log("Resultado UPDATE exitoso:", res);
    }
  } catch (err) {
    console.error("CAPTURADO ERROR EXACTO:", err);
  } finally {
    process.exit(0);
  }
}

run();
