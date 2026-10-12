const { executeQuery } = require('./config/db');

async function run() {
  const query = `
    SELECT TOP 5 nombre, codigo, equipo_asociado FROM items_inventario WHERE equipo_asociado LIKE '%BS-230%'
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
