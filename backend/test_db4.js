const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.itemInventario.findFirst({
    where: { codigo: 'REA-CL-105-011500-00' }
  });
  console.log('Equipo asociado:', item.equipo_asociado);
}
main().catch(console.error).finally(() => prisma.$disconnect());
