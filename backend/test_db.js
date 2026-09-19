const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.itemInventario.findFirst({
    where: { codigo: '105-011500-00' },
    include: { LotesReactivos: true, stock_sucursales: true }
  });
  console.log(JSON.stringify(item, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
