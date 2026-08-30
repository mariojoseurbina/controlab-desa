const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const configs = await prisma.costoPruebaConfig.findMany({
    where: {
      prueba: {
        nombre_prueba: {
          contains: 'Glicemia'
        }
      }
    },
    include: {
      prueba: true,
      equipo: true,
      consumibles: {
        include: {
          item: true
        }
      }
    }
  });

  console.log(JSON.stringify(configs, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
