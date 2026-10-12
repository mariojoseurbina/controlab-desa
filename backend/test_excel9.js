const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:\\\\controlab-desa\\\\Archivos en excel';
const files = fs.readdirSync(dir);
const targetFile = files.find(f => f.includes('CIACLAB Estructura Costos Actualizada') && !f.includes('~') && f.endsWith('.xlsx') && !f.includes('Actualizado.xlsx') && !f.includes('backup'));
const fullPath = path.join(dir, targetFile);

const workbook = xlsx.readFile(fullPath, { cellFormula: true });
const worksheet = workbook.Sheets['1. ESTANDAR EQUIPOS (INSERTOS)'];

for(let R = 5; R <= 6; ++R) {
  let row = [];
  for(let C = 0; C <= 11; ++C) {
    const cellRef = xlsx.utils.encode_cell({c: C, r: R});
    const cell = worksheet[cellRef];
    row.push(cell ? (cell.f ? '=' + cell.f : cell.v) : null);
  }
  console.log('Row ' + R + ':', row);
}
