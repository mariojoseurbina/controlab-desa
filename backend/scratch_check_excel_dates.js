const xlsx = require('xlsx');

async function run() {
  const file = 'C:\\controlab-desa\\Archivos en excel\\Ficha prueba de producto act. 07-10-26 (CLIA900i-CM-260i-BS-230i-ACCRE).xlsx';
  const workbook = xlsx.readFile(file, { cellDates: true });
  const data = xlsx.utils.sheet_to_json(workbook.Sheets['BS-230i']);
  
  const row0 = data[0];
  const keys = Object.keys(row0);
  
  const pnKey = keys.find(k => k.trim().toUpperCase() === 'P/N');
  const descKey = keys.find(k => k.trim().toUpperCase() === 'DESCRIPCIÓN' || k.trim().toUpperCase() === 'DESCRIPCION');
  const dateKey = keys.find(k => k.trim().toLowerCase().includes('fecha'));
  const loteKey = keys.find(k => k.trim().toLowerCase().includes('lote'));
  
  console.log(`P/N Key: ${pnKey}`);
  console.log(`Desc Key: ${descKey}`);
  console.log(`Date Key: ${dateKey}`);
  console.log(`Lote Key: ${loteKey}`);

  let validItems = [];
  data.forEach(r => {
    if (r[loteKey] && r[dateKey]) {
      let dateVal = r[dateKey];
      if (dateVal instanceof Date) {
        // already a date
      } else if (typeof dateVal === 'number') {
        // excel serial date
        dateVal = new Date(Math.round((dateVal - 25569)*86400*1000));
      }
      validItems.push({
        pn: String(r[pnKey]).trim(),
        desc: String(r[descKey]).trim(),
        lote: String(r[loteKey]).trim(),
        fechaExcel: dateVal
      });
    }
  });

  console.log(`Encontrados ${validItems.length} items con lote y fecha en el Excel.`);
  console.log("Muestra:", validItems.slice(0, 5));
}
run();
