const sql = require('mssql');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const configInfolab = {
  user: 'infolab',
  password: '110367',
  server: 'localhost',
  database: 'infolab',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function migrateExams() {
  let pool;
  try {
    console.log('🔄 Conectando a la base de datos infolab...');
    pool = await sql.connect(configInfolab);
    
    console.log('📦 Extrayendo exámenes de infolab...');
    const result = await pool.request().query(`
      SELECT ID, Codigo, Reporte, Unidades 
      FROM Examenes 
      WHERE Activo = 'S' AND Reporte IS NOT NULL AND Reporte != ''
    `);
    
    const examenes = result.recordset;
    console.log(`✅ Se encontraron ${examenes.length} exámenes activos en Infolab.`);
    
    let count = 0;
    for (const ex of examenes) {
      // Check if it already exists
      const codigoStr = ex.Codigo ? String(ex.Codigo).trim() : `ID-${ex.ID}`;
      const nombreStr = ex.Reporte ? String(ex.Reporte).trim() : `Examen ${ex.ID}`;
      
      const exists = await prisma.parametroExamenHumano.findFirst({
        where: {
          codigo: codigoStr
        }
      });
      
      if (!exists) {
        await prisma.parametroExamenHumano.create({
          data: {
            codigo: codigoStr,
            nombre: nombreStr,
            unidad: ex.Unidades ? String(ex.Unidades).trim() : null,
            activo: true
          }
        });
        count++;
      }
    }
    
    console.log(`🎉 Migración de catálogo de exámenes completada. ${count} nuevos exámenes insertados.`);
  } catch (error) {
    console.error('❌ Error migrando exámenes:', error);
  } finally {
    if (pool) await pool.close();
    await prisma.$disconnect();
  }
}

migrateExams();
