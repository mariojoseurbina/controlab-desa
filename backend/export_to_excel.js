const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando migración...');
  const items = await prisma.itemInventario.findMany({
    where: { 
      categoria: { in: ['Reactivo', 'Calibrador', 'Control', 'Reactivos', 'Calibradores', 'Controles'] },
      activo: true
    }
  });
  console.log('Encontrados ' + items.length + ' productos en la base de datos.');

  const dir = 'C:\\\\controlab-desa\\\\Archivos en excel';
  const files = fs.readdirSync(dir);
  const targetFile = files.find(f => f.includes('CIACLAB Estructura Costos Actualizada') && !f.includes('~') && f.endsWith('.xlsx') && !f.includes('Actualizado.xlsx') && !f.includes('backup'));
  const fullPath = path.join(dir, targetFile);
  console.log('Abriendo archivo Excel:', fullPath);

  const workbook = xlsx.readFile(fullPath, { cellFormula: true, cellStyles: true });
  const sheetName = '1. ESTANDAR EQUIPOS (INSERTOS)';
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error('No se encontró la hoja: ' + sheetName);
  }

  const range = xlsx.utils.decode_range(worksheet['!ref']);
  
  const existingProducts = {};
  for(let R = 5; R <= range.e.r; ++R) {
    const cellRef = xlsx.utils.encode_cell({c: 3, r: R});
    const cell = worksheet[cellRef];
    if (cell && cell.v) {
      existingProducts[cell.v.toString().trim().toLowerCase()] = R;
    }
  }

  let rowsAdded = 0;
  let rowsUpdated = 0;
  let currentRow = range.e.r + 1;

  for(const item of items) {
    const itemName = item.nombre ? item.nombre.trim() : '';
    if (!itemName) continue;

    const rowIdx = existingProducts[itemName.toLowerCase()];
    
    const colMap = {
      1: item.equipo_asociado || '',
      2: item.area_operativa || '',
      3: itemName,
      4: item.descripcion || item.referencia || '',
      5: item.presentacion || '',
      6: item.pruebas_teoricas_caja ? Number(item.pruebas_teoricas_caja) : '',
      7: item.porcentaje_merma || 0.08,
      9: item.precio_costo ? Number(item.precio_costo) : '',
      11: item.proveedor || ''
    };

    if (rowIdx !== undefined) {
      let updated = false;
      for (const [c, val] of Object.entries(colMap)) {
        if (val === '' || val === null || val === undefined) continue;
        
        const cellRef = xlsx.utils.encode_cell({c: Number(c), r: rowIdx});
        if (!worksheet[cellRef] || worksheet[cellRef].v === undefined || worksheet[cellRef].v === null || worksheet[cellRef].v === '') {
          worksheet[cellRef] = { t: typeof val === 'number' ? 'n' : 's', v: val };
          updated = true;
        }
      }
      if (updated) rowsUpdated++;
    } else {
      worksheet[xlsx.utils.encode_cell({c: 0, r: currentRow})] = { t: 'n', v: currentRow - 4 }; 
      for (const [c, val] of Object.entries(colMap)) {
        if (val !== '' && val !== null && val !== undefined) {
          worksheet[xlsx.utils.encode_cell({c: Number(c), r: currentRow})] = { t: typeof val === 'number' ? 'n' : 's', v: val };
        }
      }
      
      const rendTeorico = colMap[6];
      if (typeof rendTeorico === 'number') {
        const merma = colMap[7];
        const rendEfectivo = Math.floor(rendTeorico * (1 - merma));
        worksheet[xlsx.utils.encode_cell({c: 8, r: currentRow})] = { t: 'n', v: rendEfectivo };
        
        const costo = colMap[9];
        if (typeof costo === 'number' && rendEfectivo > 0) {
          worksheet[xlsx.utils.encode_cell({c: 10, r: currentRow})] = { t: 'n', v: costo / rendEfectivo };
        }
      }
      
      currentRow++;
      rowsAdded++;
    }
  }

  range.e.r = Math.max(range.e.r, currentRow - 1);
  worksheet['!ref'] = xlsx.utils.encode_range(range);

  console.log('Se actualizaron ' + rowsUpdated + ' productos existentes (rellenando vacíos).');
  console.log('Se agregaron ' + rowsAdded + ' productos nuevos.');
  
  const backupPath = fullPath.replace('.xlsx', '.backup.xlsx');
  fs.copyFileSync(fullPath, backupPath);
  console.log('Backup creado:', backupPath);

  const newPath = fullPath;
  xlsx.writeFile(workbook, newPath);
  console.log('Archivo actualizado guardado con éxito:', newPath);
}

main().catch(console.error).finally(() => prisma.$disconnect());
