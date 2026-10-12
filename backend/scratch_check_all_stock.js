const { executeQuery } = require('./config/db');

async function run() {
  const query = `
    SELECT 
      i.nombre, 
      l.NumeroLote, 
      l.CantidadActual,
      l.Estado
    FROM LotesReactivos l
    JOIN items_inventario i ON l.InventarioId = i.id
    WHERE l.CantidadActual > 0
      AND i.equipo_asociado LIKE '%BS-230%'
  `;
  try {
    const rows = await executeQuery(query);
    console.log(rows);
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
