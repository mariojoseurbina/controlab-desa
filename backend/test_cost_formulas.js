const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const costosService = require('./src/modules/costos/costos.service');

async function testFormulas() {
  console.log('🧪 Iniciando pruebas de fórmula de costos unitarios...');
  
  try {
    // 1. Limpiar o preparar datos de prueba
    console.log('🧹 Preparando datos de prueba...');
    
    // Crear/actualizar prueba maestra
    const prueba = await prisma.pruebas_maestra.upsert({
      where: { nombre_prueba: 'Glicemia (Test)' },
      update: { activo: true },
      create: { nombre_prueba: 'Glicemia (Test)', activo: true }
    });
    
    // Crear items en inventario para consumibles y reactivo
    // A: Reactivo Glucosa
    const reactivo = await prisma.itemInventario.upsert({
      where: { codigo: 'TEST-REACT-GLUCOSA' },
      update: { precio_costo: 100.00, categoria: 'Reactivo' },
      create: {
        codigo: 'TEST-REACT-GLUCOSA',
        nombre: 'Reactivo Glucosa Test',
        categoria: 'Reactivo',
        unidad: 'Kit',
        precio_costo: 100.00,
        stock_actual: 5
      }
    });

    // B: Tubo tapa amarilla
    const tubo = await prisma.itemInventario.upsert({
      where: { codigo: 'TEST-TUBO-AMARILLO' },
      update: { precio_costo: 0.15, categoria: 'Consumible' },
      create: {
        codigo: 'TEST-TUBO-AMARILLO',
        nombre: 'Tubo Tapa Amarilla Test',
        categoria: 'Consumible',
        unidad: 'Unidad',
        precio_costo: 0.15,
        stock_actual: 1000
      }
    });

    // C: Aguja/Scalp
    const aguja = await prisma.itemInventario.upsert({
      where: { codigo: 'TEST-AGUJA' },
      update: { precio_costo: 0.25, categoria: 'Consumible' },
      create: {
        codigo: 'TEST-AGUJA',
        nombre: 'Aguja de Extracción Test',
        categoria: 'Consumible',
        unidad: 'Unidad',
        precio_costo: 0.25,
        stock_actual: 1000
      }
    });

    // D: Algodón (fracción)
    const algodon = await prisma.itemInventario.upsert({
      where: { codigo: 'TEST-ALGODON' },
      update: { precio_costo: 0.05, categoria: 'Consumible' },
      create: {
        codigo: 'TEST-ALGODON',
        nombre: 'Algodón en Esferas Test',
        categoria: 'Consumible',
        unidad: 'Unidad',
        precio_costo: 0.05,
        stock_actual: 1000
      }
    });

    // E: Puntas amarillas (fracción)
    const punta = await prisma.itemInventario.upsert({
      where: { codigo: 'TEST-PUNTA-AMARILLA' },
      update: { precio_costo: 0.10, categoria: 'Consumible' },
      create: {
        codigo: 'TEST-PUNTA-AMARILLA',
        nombre: 'Punta Amarilla de Pipeta Test',
        categoria: 'Consumible',
        unidad: 'Unidad',
        precio_costo: 0.10,
        stock_actual: 2000
      }
    });

    // 2. Configurar gastos mensuales globales del mes de prueba (Junio 2026)
    console.log('📊 Configurando gastos mensuales globales...');
    const gastoGlobal = await costosService.saveGastosGlobales({
      mes: 6,
      anio: 2026,
      gastos_administrativos: 2000.00, // $2000 de gastos administrativos
      gastos_personal: 4000.00,       // $4000 de nómina
      total_pruebas_mes: 5000         // Denominador para prorrateo
    });

    // 3. Configurar gastos del equipo asociado
    console.log('🔬 Configurando gastos del equipo de química...');
    const costoEquipo = await costosService.saveCostoEquipo({
      nombre_equipo: 'Equipo Química Automático Test',
      gasto_soluciones: 100.00,
      gasto_calibradores: 100.00,
      gasto_controles: 100.00,
      total_pruebas_equipo: 1000 // $300 acumulados / 1000 pruebas = $0.30 por prueba
    });

    // 4. Configurar la prueba en la calculadora
    console.log('⚙️ Guardando configuración de prueba...');
    const config = await costosService.saveCostoPruebaConfig({
      prueba_id: prueba.id,
      precio_venta: 5.00,         // Precio de venta sugerido
      desperdicio_pct: 5.00,      // 5% de desperdicio de reactivo
      pruebas_por_kit: 500,       // 500 pruebas estimadas por kit
      reactivo_id: reactivo.id,
      equipo_id: costoEquipo.id,
      consumibles: [
        { item_id: tubo.id, cantidad: 1.0, fase: 'TOMA_MUESTRA' },
        { item_id: aguja.id, cantidad: 1.0, fase: 'TOMA_MUESTRA' },
        { item_id: algodon.id, cantidad: 1.0, fase: 'TOMA_MUESTRA' },
        { item_id: punta.id, cantidad: 1.0, fase: 'PROCESAMIENTO' }
      ]
    });

    // 5. Ejecutar el cálculo y assert matemáticos
    console.log('🧮 Ejecutando cálculo de costos...');
    const resultado = await costosService.calcularCostoPrueba(prueba.id, 6, 2026);
    
    console.log('=============================================');
    console.log('📊 RESULTADO DEL CÁLCULO DE COSTOS UNITARIOS:');
    console.log(JSON.stringify(resultado, null, 2));
    console.log('=============================================');

    // Asserts Matemáticos
    // Reactivo: ($100 / 500) * 1.05 = $0.21
    // Toma de muestra (tubo + aguja + algodon): 0.15 + 0.25 + 0.05 = $0.45
    // Procesamiento (punta): $0.10
    // Equipo: ($100 + $100 + $100) / 1000 = $0.30
    // Administrativo: $2000 / 5000 = $0.40
    // Personal: $4000 / 5000 = $0.80
    // Costo total unitario esperado = 0.21 + 0.45 + 0.10 + 0.30 + 0.40 + 0.80 = $2.26
    // Margen esperado: ((5.00 - 2.26) / 5.00) * 100 = 54.80%
    // Semáforo esperado: VERDE (>50%)

    console.log('🔎 Verificando consistencia matemática...');
    const totalUnitario = resultado.costo_total_unitario;
    const margenGanancia = resultado.margen_ganancia_pct;
    const semaforo = resultado.indicador_semaforo;

    let errores = 0;
    if (Math.abs(totalUnitario - 2.26) > 0.001) {
      console.error(`❌ ERROR: El costo unitario total esperado era 2.26, pero se calculó ${totalUnitario}`);
      errores++;
    } else {
      console.log('✅ Costo total unitario es correcto: $2.26');
    }

    if (Math.abs(margenGanancia - 54.80) > 0.01) {
      console.error(`❌ ERROR: El margen de ganancia esperado era 54.80%, pero se calculó ${margenGanancia}%`);
      errores++;
    } else {
      console.log('✅ Margen de ganancia es correcto: 54.80%');
    }

    if (semaforo !== 'VERDE') {
      console.error(`❌ ERROR: El semáforo esperado era VERDE, pero se obtuvo ${semaforo}`);
      errores++;
    } else {
      console.log('✅ Indicador semafórico es correcto: VERDE');
    }

    if (errores === 0) {
      console.log('🏆 ¡Todas las pruebas de fórmulas matemáticas pasaron con éxito!');
    } else {
      console.error(`❌ Fallaron ${errores} validaciones.`);
    }

  } catch (error) {
    console.error('❌ Error general durante la ejecución de las pruebas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFormulas();
