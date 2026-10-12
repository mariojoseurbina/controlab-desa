const xlsx = require('xlsx');
const { executeQuery } = require('./config/db');
const fs = require('fs');

async function run() {
  try {
    // 1. Read Excel
    const file = 'C:\\controlab-desa\\Archivos en excel\\Ficha prueba de producto act. 07-10-26 (CLIA900i-CM-260i-BS-230i-ACCRE).xlsx';
    const workbook = xlsx.readFile(file);
    const data = xlsx.utils.sheet_to_json(workbook.Sheets['BS-230i']);
    
    // The "P/N" column might have whitespace keys or something. Let's find the exact key.
    const row0 = data[0];
    const keys = Object.keys(row0);
    const pnKey = keys.find(k => k.trim().toUpperCase() === 'P/N');
    const descKey = keys.find(k => k.trim().toUpperCase() === 'DESCRIPCIÓN' || k.trim().toUpperCase() === 'DESCRIPCION');
    
    if (!pnKey) throw new Error("No se encontro columna P/N");
    
    const validPNs = data.map(r => String(r[pnKey]).trim()).filter(Boolean);
    console.log(`Encontrados ${validPNs.length} P/N validos en el Excel.`);

    // 2. Query Database
    const query = `
      SELECT 
        i.nombre, 
        i.codigo,
        l.NumeroLote, 
        l.CantidadActual, 
        l.FechaVencimiento, 
        i.precio_costo,
        l.Estado
      FROM LotesReactivos l
      JOIN items_inventario i ON l.InventarioId = i.id
      WHERE l.Estado = 'Activo' 
        AND l.CantidadActual > 0
        AND i.equipo_asociado LIKE '%BS-230%'
        AND l.NumeroLote NOT IN ('1')
        AND l.NumeroLote NOT LIKE '%TEST%'
      ORDER BY l.FechaVencimiento ASC
    `;
    const rows = await executeQuery(query);
    
    // 3. Cross-reference
    const filteredRows = rows.filter(row => {
      // Check if row.codigo contains any of the valid PNs
      if (!row.codigo) return false;
      return validPNs.some(pn => row.codigo.includes(pn));
    });
    
    console.log(`De ${rows.length} lotes totales en DB (BS-230), ${filteredRows.length} coinciden con el Excel y son stock real.`);

    let totalGlobal = 0;
    const porMes = {};

    filteredRows.forEach(row => {
      // Ignore 2026-01-01 ghost lot logic as well
      if (row.FechaVencimiento.toISOString().startsWith('2026-01-01')) return;

      const dateStr = row.FechaVencimiento.toISOString().substring(0, 7);
      if (!porMes[dateStr]) porMes[dateStr] = { totalUSD: 0, items: [] };

      const cantidad = parseFloat(row.CantidadActual) || 0;
      const precio = parseFloat(row.precio_costo) || 0;
      const valorizado = cantidad * precio;

      totalGlobal += valorizado;
      porMes[dateStr].totalUSD += valorizado;
      
      const existingItem = porMes[dateStr].items.find(i => i.nombre === row.nombre);
      if (existingItem) {
        existingItem.cantidad += cantidad;
        existingItem.valorizado += valorizado;
      } else {
        porMes[dateStr].items.push({
          nombre: row.nombre,
          codigo: row.codigo,
          cantidad,
          valorizado,
          precio_unitario: precio
        });
      }
    });

    let md = `# Reporte de Vencimiento y Valorización Real (Cruce Excel) - Equipo Mindray BS-230\n\n`;
    md += `**Generado:** ${new Date().toISOString().substring(0,10)}\n`;
    md += `**Total Valorizado Físico Real:** $${totalGlobal.toFixed(2)} USD\n\n`;
    md += `> [!NOTE]\n> Este reporte **ha sido cruzado estrictamente con el archivo Excel Maestro** (\`Ficha prueba de producto...\`). Solo incluye productos cuyo \`P/N\` existe en la pestaña \`BS-230i\`. Además, excluye cajas de prueba/fantasma (Lote 1, TEST, 01/01/2026).\n\n`;

    md += `## 📅 Resumen Mensual de Vencimientos\n\n`;
    md += `| Mes de Vencimiento | Valorizado (USD) | Nivel de Riesgo |\n`;
    md += `|---|---|---|\n`;
    
    Object.keys(porMes).sort().forEach(mes => {
      const data = porMes[mes];
      let riesgo = '🟢 Bajo';
      const mesesDiff = (new Date(mes + '-01') - new Date()) / (1000 * 60 * 60 * 24 * 30);
      if (mesesDiff < 3) riesgo = '🔴 Alto';
      else if (mesesDiff < 6) riesgo = '🟡 Medio';
      
      md += `| ${mes} | $${data.totalUSD.toFixed(2)} | ${riesgo} |\n`;
    });

    md += `\n## 🔬 Detalle por Mes y Reactivo\n\n`;

    Object.keys(porMes).sort().forEach(mes => {
      const data = porMes[mes];
      md += `### Vencimientos en ${mes}\n`;
      md += `**Valor Total del Mes:** $${data.totalUSD.toFixed(2)} USD\n\n`;
      md += `| P/N (Código) | Reactivo | Cajas (Físicas) | Precio U. (USD) | Valorizado (USD) |\n`;
      md += `|---|---|---|---|---|\n`;
      
      data.items.sort((a,b) => b.valorizado - a.valorizado).forEach(item => {
        md += `| ${item.codigo} | ${item.nombre} | ${item.cantidad.toFixed(2)} | $${item.precio_unitario.toFixed(2)} | $${item.valorizado.toFixed(2)} |\n`;
      });
      md += `\n`;
    });

    fs.writeFileSync('C:\\Users\\SQL Admin\\.gemini\\antigravity-ide\\brain\\144be86f-e602-4518-95e1-a3f2ef39c569\\reporte_bs230_fisico_excel.md', md);
    console.log("Reporte MD cruzado generado exitosamente.");

  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
