const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.logSniffer.count({
    where: {
      test_name: {
        contains: 'UREA'
      },
      procesado: true
    }
  });

  const queryCount = await prisma.logSniffer.count({
    where: {
      raw_frame: {
        contains: 'QRD|' // A simple check for queries if they don't have isQry saved correctly, but let's just count all Ureas and maybe group them.
      },
      test_name: {
        contains: 'UREA'
      }
    }
  });

  console.log(`TOTAL UREAS: ${count}`);
  console.log(`TOTAL UREAS (QUERIES): ${queryCount}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
