const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:\\\\controlab-desa\\\\Archivos en excel';
const files = fs.readdirSync(dir);
const targetFile = files.find(f => f.includes('CIACLAB Estructura Costos Actualizada') && !f.includes('~') && f.endsWith('.xlsx') && !f.includes('Actualizado.xlsx') && !f.includes('backup'));
const fullPath = path.join(dir, targetFile);

const workbook = xlsx.readFile(fullPath);

for(let sheetName of ['1. ESTANDAR EQUIPOS (INSERTOS)', '2. COSTOS PRUEBAS RAPIDAS', '3. MMQ Y CONSUMIBLES']) {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) continue;
  const range = xlsx.utils.decode_range(worksheet['!ref']);
  for(let R = range.s.r; R <= Math.min(range.s.r + 6, range.e.r); ++R) {
    let row = [];
    for(let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = xlsx.utils.encode_cell({c: C, r: R});
      const cell = worksheet[cellRef];
      if (cell && cell.v) row.push(cell.v);
    }
    if (row.length > 3) {
      console.log('Headers in ' + sheetName + ':', row);
      break;
    }
  }
}
