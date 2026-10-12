const xlsx = require('xlsx');
const { executeQuery } = require('./config/db');

async function run() {
  const file = 'C:\\controlab-desa\\Archivos en excel\\Ficha prueba de producto act. 07-10-26 (CLIA900i-CM-260i-BS-230i-ACCRE).xlsx';
  const workbook = xlsx.readFile(file);
  const data = xlsx.utils.sheet_to_json(workbook.Sheets['BS-230i']);
  
  const descKey = Object.keys(data[0]).find(k => k.trim().toUpperCase() === 'DESCRIPCIÓN' || k.trim().toUpperCase() === 'DESCRIPCION' || k.trim().toUpperCase() === 'NOMBRE');
  
  if (!descKey) {
    console.log("No se encontro columna descripcion", Object.keys(data[0]));
    process.exit(1);
  }

  const excelNames = data.map(r => String(r[descKey]).trim().toUpperCase());
  
  console.log("Nombres en excel (primeros 5):", excelNames.slice(0, 5));

  const query = `
    SELECT i.nombre, i.codigo
    FROM items_inventario i
    WHERE i.equipo_asociado LIKE '%BS-230%'
  `;
  const rows = await executeQuery(query);
  
  let matchCount = 0;
  rows.forEach(r => {
    const dbName = r.nombre.trim().toUpperCase();
    if (excelNames.includes(dbName)) {
      matchCount++;
    } else {
      // try fuzzy match
      const isFuzzy = excelNames.some(en => dbName.includes(en) || en.includes(dbName));
      if (isFuzzy) matchCount++;
    }
  });

  console.log(`De ${rows.length} items en BD para BS-230, ${matchCount} coinciden por nombre con el Excel.`);
  process.exit();
}
run();
