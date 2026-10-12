const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:\\\\controlab-desa\\\\Archivos en excel';
const files = fs.readdirSync(dir);
const targetFile = files.find(f => f.includes('CIACLAB Estructura Costos Actualizada') && !f.includes('~') && f.endsWith('.xlsx') && !f.includes('Actualizado.xlsx') && !f.includes('backup'));
const fullPath = path.join(dir, targetFile);

const workbook = xlsx.readFile(fullPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const range = xlsx.utils.decode_range(worksheet['!ref']);
let headerRow = -1;
for(let R = range.s.r; R <= range.e.r; ++R) {
  for(let C = range.s.c; C <= range.e.c; ++C) {
    const cellRef = xlsx.utils.encode_cell({c: C, r: R});
    const cell = worksheet[cellRef];
    if (cell && cell.v && typeof cell.v === 'string' && cell.v.toLowerCase().includes('código')) {
      headerRow = R;
      break;
    }
  }
  if (headerRow !== -1) break;
}

if (headerRow !== -1) {
  let headers = [];
  for(let C = range.s.c; C <= range.e.c; ++C) {
    const cellRef = xlsx.utils.encode_cell({c: C, r: headerRow});
    const cell = worksheet[cellRef];
    headers.push(cell ? cell.v : null);
  }
  console.log('Found headers at row ' + headerRow + ':', headers);
} else {
  console.log('Headers not found');
}
