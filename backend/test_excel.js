const fs = require('fs');
const path = require('path');
let xlsx;
try {
  xlsx = require('xlsx');
} catch(e) {
  console.log('xlsx module not found, please install it');
  process.exit(1);
}

const dir = 'C:\\\\controlab-desa\\\\Archivos en excel';
const files = fs.readdirSync(dir);
const targetFile = files.find(f => f.includes('CIACLAB Estructura Costos Actualizada') && !f.includes('~') && f.endsWith('.xlsx') && !f.includes('Actualizado.xlsx') && !f.includes('backup'));

if (!targetFile) {
  console.log('File not found in', dir);
  process.exit(1);
}

const fullPath = path.join(dir, targetFile);
console.log('Reading file:', fullPath);

const workbook = xlsx.readFile(fullPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Get headers (first row)
const range = xlsx.utils.decode_range(worksheet['!ref']);
const headers = [];
for(let C = range.s.c; C <= range.e.c; ++C) {
  const cellAddress = {c: C, r: range.s.r};
  const cellRef = xlsx.utils.encode_cell(cellAddress);
  const cell = worksheet[cellRef];
  headers.push(cell ? cell.v : null);
}

console.log('Headers:', headers);
