const inventoryRepository = require('./src/modules/inventory/inventory.repository');

async function testRepo() {
  console.log('🧪 Probando creación directa en Controlab IA...');
  try {
    const item = await inventoryRepository.create({
      codigo: 'TEST-REPOS-99',
      nombre: 'Reactivo Test Directo SQL',
      categoria: 'Reactivo',
      unidad: 'Cajas * 50',
      stock_actual: 50,
      stock_minimo: 10,
      stock_critico: 5,
      precio_costo: 50.00,
      precio_venta: 70.00,
      marca: 'Mindray',
      referencia: 'TSH',
      grupo: 'REACTIVO',
      panel: 'TIROIDES',
      control_asociado: 'TSH',
      calibradores_asociados: 'Free',
      unidad_manejo: 'UND',
      cantidad_unidades: 50,
      costo_unitario_manejo: 1.0,
      aplica_iva: false,
      porcentaje_utilidad: 40,
      stock_promedio: 40,
      stock_maximo: 100,
      unidad_negocio: 'ALM-LABORATORIO CLINICO'
    });
    console.log('✅ ÉXITO TOTAL! Ítem creado:', item.id, item.nombre, item.codigo);
  } catch (err) {
    console.error('❌ Error en creación:', err.message);
  }
}

testRepo();
