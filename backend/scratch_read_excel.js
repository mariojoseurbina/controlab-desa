const xlsx = require('xlsx');
const file = 'C:\\controlab-desa\\Archivos en excel\\Ficha prueba de producto act. 07-10-26 (CLIA900i-CM-260i-BS-230i-ACCRE).xlsx';
const workbook = xlsx.readFile(file);
const sheetName = workbook.SheetNames.find(s => s.toUpperCase().includes('BS-230') || s.toUpperCase().includes('BS230') || s.toUpperCase() === 'BS-230');

if (!sheetName) {
  console.log("No se encontro la pestana BS-230. Pestanas disponibles:", workbook.SheetNames);
  process.exit(1);
}

const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
const productNames = data.map(r => r['Nombre del Producto'] || r['Producto'] || r['NOMBRE DEL PRODUCTO'] || r['DESCRIPCION']).filter(n => n);
console.log("Pestana encontrada:", sheetName);
console.log("Cantidad de productos en Excel:", productNames.length);
console.log("Primeros 5:", productNames.slice(0, 5));
