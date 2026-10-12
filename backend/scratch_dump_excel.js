const xlsx = require('xlsx');

async function run() {
  const file = 'C:\\controlab-desa\\Archivos en excel\\Ficha prueba de producto act. 07-10-26 (CLIA900i-CM-260i-BS-230i-ACCRE).xlsx';
  const workbook = xlsx.readFile(file, { cellDates: false });
  const data = xlsx.utils.sheet_to_json(workbook.Sheets['BS-230i'], { header: 1 });
  
  const headers = data[1];
  console.log("Cabeceras reales:", headers);
  
  for (let i = 2; i < 5; i++) {
    console.log(`Fila ${i}:`, data[i]);
  }
}
run();
