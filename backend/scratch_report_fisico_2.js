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
          estado: row.Estado,
          fecha_exacta: row.FechaVencimiento.toISOString().substring(0, 10)
        });
      }
    });

    let md = `# Reporte Físico Real de Vencimiento y Valorización - Equipo Mindray BS-230\n\n`;
    md += `**Generado:** ${new Date().toISOString().substring(0,10)} (FECHAS CORREGIDAS SEGÚN EXCEL MAESTRO)\n`;
    md += `**Total Valorizado Físico Real (Cerrado + Activo):** $${totalGlobal.toFixed(2)} USD\n\n`;
    md += `> [!NOTE]\n> Se han corregido las fechas de vencimiento en la base de datos para que coincidan exactamente con la imagen referencial provista.\n\n`;

    md += `## 🔬 Detalle por Mes y Reactivo (Stock Físico)\n\n`;

    Object.keys(porMes).sort().forEach(mes => {
      const data = porMes[mes];
      md += `### Vencimientos en ${mes}\n`;
      md += `**Valor Total del Mes:** $${data.totalUSD.toFixed(2)} USD\n\n`;
      md += `| Reactivo | Fecha Exacta | Cajas (Físicas) | Valorizado (USD) |\n`;
      md += `|---|---|---|---|\n`;
      
      data.items.sort((a,b) => b.valorizado - a.valorizado).forEach(item => {
        md += `| ${item.nombre} | **${item.fecha_exacta}** | ${item.cantidad.toFixed(2)} | $${item.valorizado.toFixed(2)} |\n`;
      });
      md += `\n`;
    });

    fs.writeFileSync('C:\\Users\\SQL Admin\\.gemini\\antigravity-ide\\brain\\144be86f-e602-4518-95e1-a3f2ef39c569\\reporte_bs230_fisico_real_corregido.md', md);
    console.log("Reporte MD físico real generado exitosamente.");

  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
