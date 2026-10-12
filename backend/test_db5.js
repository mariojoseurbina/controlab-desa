const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.itemInventario.findMany({
    where: { 
      categoria: { in: ['Reactivo', 'Calibrador', 'Control', 'Reactivos', 'Calibradores', 'Controles'] },
      activo: true
    }
  });
  console.log('Found ' + items.length + ' items');
}
main().catch(console.error).finally(() => prisma.$disconnect());
