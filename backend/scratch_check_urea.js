const { executeQuery } = require('./config/db');

async function run() {
  const query = `
    SELECT top 5 
      i.nombre, 
      l.NumeroLote, 
      l.CantidadActual, 
      l.FechaVencimiento, 
      l.PrecioRecepcionUSD, 
      i.precio_costo,
      l.Estado
    FROM LotesReactivos l
    JOIN items_inventario i ON l.InventarioId = i.id
    WHERE i.nombre LIKE '%UREA%'
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
