const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const dir = 'C:\\\\controlab-desa\\\\Archivos en excel';
const files = fs.readdirSync(dir);
const targetFile = files.find(f => f.includes('CIACLAB Estructura Costos Actualizada') && !f.includes('~') && f.endsWith('.xlsx') && !f.includes('Actualizado.xlsx') && !f.includes('backup'));
const fullPath = path.join(dir, targetFile);

const workbook = xlsx.readFile(fullPath);
console.log('Sheet Names:', workbook.SheetNames);
