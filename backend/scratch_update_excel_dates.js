const xlsx = require('xlsx');
const { executeQuery } = require('./config/db');

async function run() {
  const file = 'C:\\controlab-desa\\Archivos en excel\\Ficha prueba de producto act. 07-10-26 (CLIA900i-CM-260i-BS-230i-ACCRE).xlsx';
  const workbook = xlsx.readFile(file, { cellDates: true });
  const data = xlsx.utils.sheet_to_json(workbook.Sheets['BS-230i'], { header: 1 });
  
  // Headers are likely at index 1 or 0
  const headers = data[1] || data[0]; 
  const descIdx = headers.findIndex(h => h && h.toString().toUpperCase().includes('DESCRIPCIÓN'));
  const pnIdx = headers.findIndex(h => h && h.toString().toUpperCase().includes('P/N'));
  const dateIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes('fecha venc'));
  const loteIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes('lote'));

  let updates = [];
  
  for (let i = 2; i < data.length; i++) {
    const r = data[i];
    if (r[loteIdx] && r[dateIdx] && r[pnIdx]) {
      let dateVal = r[dateIdx];
      let dateStr = '';
      if (dateVal instanceof Date) {
        dateStr = dateVal.toISOString().substring(0, 10);
      } else if (typeof dateVal === 'number') {
        dateStr = new Date(Math.round((dateVal - 25569)*86400*1000)).toISOString().substring(0, 10);
      } else {
        dateStr = String(dateVal); // might be a string like '8/26/2027'
        let parts = dateStr.split('/');
        if(parts.length === 3) {
            // M/D/YYYY
            dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
      }
      
      const pn = String(r[pnIdx]).trim();
      const lote = String(r[loteIdx]).trim();
      const desc = String(r[descIdx]).trim();
      
      updates.push({ pn, desc, lote, dateStr });
    }
  }

  console.log(`Encontrados ${updates.length} items con lote y fecha en el Excel.`);
  if (updates.length > 0) {
    console.log("Muestra:", updates.slice(0, 5));
    
    let totalUpdated = 0;
    
    // Ahora vamos a actualizar la BD: LotesReactivos
    for (const u of updates) {
      // Find the item in DB using PN
      const qItem = `SELECT id FROM items_inventario WHERE codigo LIKE '%${u.pn}%'`;
      const items = await executeQuery(qItem);
      if (items.length > 0) {
        const itemId = items[0].id;
        // Update Lote Date based on Lote Number and Item Id
        const updateQuery = `
          UPDATE LotesReactivos 
          SET FechaVencimiento = '${u.dateStr}'
          WHERE InventarioId = ${itemId} AND NumeroLote = '${u.lote}'
        `;
        const res = await executeQuery(updateQuery);
        totalUpdated++;
      }
    }
    console.log(`Actualizados ${totalUpdated} lotes en la base de datos para coincidir con Excel.`);
  }

  process.exit();
}
run();
