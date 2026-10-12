const { executeQuery } = require('./config/db');

async function run() {
  const query = `
    SELECT 
      i.nombre, 
      l.NumeroLote, 
      l.CantidadActual, 
      l.FechaVencimiento, 
      l.PrecioRecepcionUSD, 
      i.precio_costo 
    FROM LotesReactivos l
    JOIN items_inventario i ON l.InventarioId = i.id
    WHERE l.Estado = 'Activo' AND l.CantidadActual > 0
    AND i.equipo_asociado LIKE '%BS-230%'
    ORDER BY l.FechaVencimiento ASC
  `;
  try {
    const rows = await executeQuery(query);
    console.log(`Encontrados ${rows.length} lotes para BS-230.`);
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
