const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOldLogs() {
  const logs = await prisma.logSniffer.findMany({
    where: {
      OR: [
        { equipo_origen: { contains: 'CLIA' } },
        { raw_frame: { contains: 'CLIA' } }
      ]
    },
    take: 15,
    orderBy: { fecha_registro: 'desc' }
  });
  console.log(JSON.stringify(logs, null, 2));
}

checkOldLogs().catch(console.error).finally(() => prisma.$disconnect());
