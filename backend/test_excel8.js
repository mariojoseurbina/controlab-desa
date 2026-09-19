const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:\\\\controlab-desa\\\\Archivos en excel';
const files = fs.readdirSync(dir);
const targetFile = files.find(f => f.includes('CIACLAB Estructura Costos Actualizada') && !f.includes('~') && f.endsWith('.xlsx') && !f.includes('Actualizado.xlsx') && !f.includes('backup'));
const fullPath = path.join(dir, targetFile);

const workbook = xlsx.readFile(fullPath);
const worksheet = workbook.Sheets['1. ESTANDAR EQUIPOS (INSERTOS)'];
const range = xlsx.utils.decode_range(worksheet['!ref']);
console.log('Sheet 1 has ' + (range.e.r - range.s.r + 1) + ' rows');

// print first 5 product rows
let count = 0;
for(let R = 5; R <= range.e.r; ++R) {
  const cellRef = xlsx.utils.encode_cell({c: 3, r: R});
  const cell = worksheet[cellRef];
  if (cell && cell.v) {
    console.log(cell.v);
    count++;
    if (count > 5) break;
  }
}
