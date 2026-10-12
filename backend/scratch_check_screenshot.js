const { executeQuery } = require('./config/db');

async function run() {
  const productNames = [
    'CLINCHEM MULTI CONTROL (LEVEL 2)',
    'ASO/CRP/RF TRIPLE CONTROL',
    'CYSC CONTROL',
    'B2-MG CONTROL',
    'TPUC CONTROL',
    'kit de a-Amylasa (Metodo IFCC) a-AMY',
    'kit de Acido Urico (Metodo URICASA PEROXIDASA) UA',
    'kit de Albumina (Metodo Verde de Bromocresol) ALB',
    'kit de Albumina Amino Transferasi ALT',
    'Kit de Antiestreptolisina ASO II',
    'kit de Aspartato Amino Transferasi AST',
    'kit de Bilirrubina Directa (Metodo VOX) BIL-D',
    'kit de Bilirrubina Total (Metodo VOX) BIL-T',
    'kit de Calcio (Metodo ARENASO) CA',
    'kit de Colesterol Total (Metodo CHOD-POD) TC',
    'kit de Creatina (Metodo SARCOSINA OXIDASA) CREA',
    'kit de Ferretina',
    'kit de Foforo (Metodo Fosfomolibdato) P',
    'kit de Fosfatasa Lacalina (Metodo IFCC) ALP',
    'kit de Gamma Glutamil Transferasi (Metodo IFCC) GGT',
    'kit de Glucosa (Metodo GOD-POD) GLU',
    'kit de Glucosa (Metodo HK) GLU-HK',
    'kit de Hierro',
    'kit de Lactato Deshi (Metodo IFCC) LDH',
    'kit de Micro Albumina',
    'kit de Proteina C Reactiva',
    'kit de Proteina Quinase-MB CK-MB',
    'kit de Proteinas Total (Metodo POR BIURETO) TP',
    'kit de Transferina',
    'kit de Trigliceridos (Metodo GPO-POD) TG',
    'kit de Urea'
  ];

  let totalItems = [];

  for (const name of productNames) {
    const query = `
      SELECT 
        i.nombre,
        l.NumeroLote,
        l.CantidadActual,
        l.FechaVencimiento,
        l.Estado
      FROM LotesReactivos l
      JOIN items_inventario i ON l.InventarioId = i.id
      WHERE i.nombre LIKE '%${name.substring(0, 15)}%'
        AND l.NumeroLote NOT IN ('1')
        AND l.NumeroLote NOT LIKE '%TEST%'
        AND l.CantidadActual > 0
    `;
    const rows = await executeQuery(query);
    if (rows.length > 0) {
      totalItems.push(...rows);
    }
  }

  // Remove duplicates just in case
  const uniqueItems = Array.from(new Set(totalItems.map(a => JSON.stringify(a)))).map(a => JSON.parse(a));
  
  uniqueItems.sort((a,b) => new Date(a.FechaVencimiento) - new Date(b.FechaVencimiento));
  
  console.log(JSON.stringify(uniqueItems, null, 2));

  process.exit();
}
run();
