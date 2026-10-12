const xlsx = require('xlsx');
const file = 'C:\\controlab-desa\\Archivos en excel\\Ficha prueba de producto act. 07-10-26 (CLIA900i-CM-260i-BS-230i-ACCRE).xlsx';
const workbook = xlsx.readFile(file);
const data = xlsx.utils.sheet_to_json(workbook.Sheets['BS-230i'], {header: 1});
console.log(data[0]);
console.log(data[1]);
