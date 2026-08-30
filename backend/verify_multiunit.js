require('dotenv').config();
const inventoryRepository = require('./src/modules/inventory/inventory.repository');

async function runTest() {
  console.log("=== PROBANDO ADAPTACIÓN DE INVENTARIO MULTI-UNIDAD ===");
  try {
    const testItemData = {
      codigo: `TEST-MULTI-${Date.now().toString().slice(-4)}`,
      nombre: 'Reactivo Prueba Multimedición (ALT/GPT)',
      categoria: 'Reactivo',
      unidad: 'Cajas',
      stock_actual: 5,
      stock_minimo: 1,
      stock_critico: 0.5,
      precio_costo: 120,
      precio_venta: 200,
      consumo_indicado: 0.36,
      frascos_por_caja: 6,
      volumen_por_frasco_ml: 100,
      volumen_muerto_frasco_ml: 2.0,
      pruebas_teoricas_frasco: 277,
      pruebas_teoricas_caja: 1666
    };

    console.log("Creando item de prueba:", testItemData.nombre);
    const created = await inventoryRepository.create(testItemData);
    console.log("✅ Item Creado Exitosamente en la BD:");
    console.log({
      id: created.id,
      codigo: created.codigo,
      nombre: created.nombre,
      frascos_por_caja: created.frascos_por_caja,
      volumen_por_frasco_ml: created.volumen_por_frasco_ml,
      volumen_muerto_frasco_ml: created.volumen_muerto_frasco_ml,
      pruebas_teoricas_frasco: created.pruebas_teoricas_frasco,
      pruebas_teoricas_caja: created.pruebas_teoricas_caja
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ Error en la prueba de inventario:", err);
    process.exit(1);
  }
}

runTest();
