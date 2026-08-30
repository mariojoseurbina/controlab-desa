const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CSV_PATH = path.join(__dirname, '../Archivos en excel/Plantilla_Inventario_Inicial.csv');

async function runBulkInsert() {
  console.log('🚀 Iniciando Carga Masiva de Inventario...');
  const results = [];

  // Leer y parsear el archivo CSV
  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`📦 Se encontraron ${results.length} productos en el archivo.`);
      
      let exitosos = 0;
      let errores = 0;

      for (const item of results) {
        try {
          // Validar campos obligatorios
          if (!item.codigo || !item.nombre || !item.categoria || !item.unidad) {
            console.error(`⚠️ Fila saltada (Faltan campos obligatorios): ${JSON.stringify(item)}`);
            errores++;
            continue;
          }

          // Insertar en la base de datos usando UPSERT (Actualiza si existe, Crea si es nuevo)
          await prisma.itemInventario.upsert({
            where: { codigo: item.codigo },
            update: {
              stock_actual: parseFloat(item.stock_actual) || 0,
              stock_minimo: parseFloat(item.stock_minimo) || 0,
              precio_costo: parseFloat(item.precio_costo) || 0,
              ubicacion: item.ubicacion || null,
              marca: item.marca || null,
              proveedor: item.proveedor || null,
              fecha_actualizacion: new Date()
            },
            create: {
              codigo: item.codigo,
              nombre: item.nombre,
              categoria: item.categoria,
              unidad: item.unidad,
              stock_actual: parseFloat(item.stock_actual) || 0,
              stock_minimo: parseFloat(item.stock_minimo) || 0,
              precio_costo: parseFloat(item.precio_costo) || 0,
              ubicacion: item.ubicacion || null,
              marca: item.marca || null,
              proveedor: item.proveedor || null,
              creado_por: 1 // Usuario Administrador por defecto
            }
          });
          exitosos++;
        } catch (error) {
          console.error(`❌ Error importando el código ${item.codigo}:`, error.message);
          errores++;
        }
      }

      console.log('=============================================');
      console.log(`✅ Carga Masiva Finalizada`);
      console.log(`✔️ Exitosos: ${exitosos}`);
      console.log(`❌ Errores: ${errores}`);
      console.log('=============================================');
      
      await prisma.$disconnect();
    });
}

runBulkInsert().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
