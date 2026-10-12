const xlsx = require('xlsx');
const path = 'C:\\IT Controlab\\REACTIVO CLIA 900i.xlsx';
const workbook = xlsx.readFile(path);
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
console.log('Total rows:', data.length);
console.log('First 5 rows:');
console.log(JSON.stringify(data.slice(0, 5), null, 2));
