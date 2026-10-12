const { executeQuery } = require('./config/db');

async function run() {
  const fixes = [
    { nombre: 'a-Amylasa', date: '2027-08-26' },
    { nombre: 'Acido Urico', date: '2027-04-14' },
    { nombre: 'Albumina (Metodo Verde de Bromocresol) ALB', date: '2027-09-02' },
    { nombre: 'Albumina Amino Transferasi ALT', date: '2027-04-10' },
    { nombre: 'Antiestreptolisina ASO II', date: '2027-07-27' },
    { nombre: 'Aspartato Amino Transferasi AST', date: '2027-12-12' },
    { nombre: 'Bilirrubina Directa (Metodo VOX) BIL-D', date: '2027-03-01' },
    { nombre: 'Bilirrubina Total (Metodo VOX) BIL-T', date: '2027-04-27' },
    { nombre: 'Calcio (Metodo ARENASO) CA', date: '2027-05-26' },
    { nombre: 'Colesterol Total (Metodo CHOD-POD) TC', date: '2027-03-28' },
    { nombre: 'Creatina (Metodo SARCOSINA OXIDASA) CREA', date: '2027-04-08' },
    { nombre: 'Ferretina', date: '2026-10-11' },
    { nombre: 'Foforo', date: '2027-02-11' },
    { nombre: 'Fosfatasa Lacalina', date: '2027-03-19' },
    { nombre: 'Gamma Glutamil Transferasi', date: '2027-02-05' },
    { nombre: 'Glucosa (Metodo GOD-POD)', date: '2027-02-02' },
    { nombre: 'Glucosa (Metodo HK)', date: '2027-02-08' },
    { nombre: 'Lactato Deshi', date: '2027-02-15' },
    { nombre: 'Micro Albumina', date: '2027-01-14' },
    { nombre: 'Proteina C Reactiva', date: '2027-03-20' },
    { nombre: 'Proteina Quinase-MB', date: '2027-09-14' },
    { nombre: 'Proteinas Total', date: '2027-09-24' },
    { nombre: 'Transferina', date: '2027-03-12' },
    { nombre: 'Trigliceridos', date: '2027-09-24' },
    { nombre: 'Urea', date: '2027-12-31' } // The screenshot doesn't show urea date clearly, leave it or check
  ];

  let totalUpdated = 0;

  for (const fix of fixes) {
    const findQ = `
      SELECT l.id, l.NumeroLote, i.nombre
      FROM LotesReactivos l
      JOIN items_inventario i ON l.InventarioId = i.id
      WHERE i.nombre LIKE '%${fix.nombre.substring(0,10)}%'
        AND l.CantidadActual > 0
        AND l.NumeroLote NOT IN ('1')
        AND l.NumeroLote NOT LIKE '%TEST%'
    `;
    const rows = await executeQuery(findQ);
    if (rows.length > 0) {
      for (const row of rows) {
        const updateQ = `UPDATE LotesReactivos SET FechaVencimiento = '${fix.date}' WHERE id = ${row.id}`;
        await executeQuery(updateQ);
        console.log(`✅ Actualizado: ${row.nombre} (Lote ${row.NumeroLote}) -> ${fix.date}`);
        totalUpdated++;
      }
    }
  }
  console.log(`Total lotes actualizados: ${totalUpdated}`);
  process.exit();
}
run();
