const { executeQuery } = require('./config/db');
const fs = require('fs');

async function run() {
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
    WHERE l.CantidadActual > 0
      AND l.Estado IN ('Activo', 'CERRADO')
      AND i.equipo_asociado LIKE '%BS-230%'
      AND l.NumeroLote NOT IN ('1')
      AND l.NumeroLote NOT LIKE '%TEST%'
    ORDER BY l.FechaVencimiento ASC
  `;
  try {
    const rows = await executeQuery(query);
    
    let totalGlobal = 0;
    const porMes = {};

    rows.forEach(row => {
      // Excluir 2026-01-01 (cajas fantasmas)
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
          precio_unitario: precio,
          estado: row.Estado
        });
      }
    });

    let md = `# Reporte Físico Real de Vencimiento y Valorización - Equipo Mindray BS-230\n\n`;
    md += `**Generado:** ${new Date().toISOString().substring(0,10)}\n`;
    md += `**Total Valorizado Físico Real (Cerrado + Activo):** $${totalGlobal.toFixed(2)} USD\n\n`;
    md += `> [!NOTE]\n> Este reporte incluye exclusivamente el **Stock Real Físico** (tanto activo como cerrado en inventario). Se han depurado y eliminado totalmente los lotes fantasma, de contingencia y cajas de prueba ('1', 'TEST', '2026-01-01').\n\n`;

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

    md += `\n## 🔬 Detalle por Mes y Reactivo (Stock Físico)\n\n`;

    Object.keys(porMes).sort().forEach(mes => {
      const data = porMes[mes];
      md += `### Vencimientos en ${mes}\n`;
      md += `**Valor Total del Mes:** $${data.totalUSD.toFixed(2)} USD\n\n`;
      md += `| Código | Reactivo | Cajas (Físicas) | Precio U. (USD) | Valorizado (USD) |\n`;
      md += `|---|---|---|---|---|\n`;
      
      data.items.sort((a,b) => b.valorizado - a.valorizado).forEach(item => {
        md += `| ${item.codigo} | ${item.nombre} | ${item.cantidad.toFixed(2)} | $${item.precio_unitario.toFixed(2)} | $${item.valorizado.toFixed(2)} |\n`;
      });
      md += `\n`;
    });

    fs.writeFileSync('C:\\Users\\SQL Admin\\.gemini\\antigravity-ide\\brain\\144be86f-e602-4518-95e1-a3f2ef39c569\\reporte_bs230_fisico_real.md', md);
    console.log("Reporte MD físico real generado exitosamente.");

  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
