const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:\\\\controlab-desa\\\\Archivos en excel';
const files = fs.readdirSync(dir);
const targetFile = files.find(f => f.includes('CIACLAB Estructura Costos Actualizada') && !f.includes('~') && f.endsWith('.xlsx') && !f.includes('Actualizado.xlsx') && !f.includes('backup'));
const fullPath = path.join(dir, targetFile);

const workbook = xlsx.readFile(fullPath);
const worksheet = workbook.Sheets['6. LISTA DE PRODUCTOS LAB CLIN'];

const range = xlsx.utils.decode_range(worksheet['!ref']);
for(let R = range.s.r; R <= Math.min(range.s.r + 5, range.e.r); ++R) {
  let row = [];
  for(let C = range.s.c; C <= range.e.c; ++C) {
    const cellRef = xlsx.utils.encode_cell({c: C, r: R});
    const cell = worksheet[cellRef];
    row.push(cell ? cell.v : null);
  }
  console.log('Row ' + R + ':', row);
}
