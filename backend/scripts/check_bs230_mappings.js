const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const mapeos = await prisma.mapeoPruebasReactivos.findMany();
    const items = await prisma.itemInventario.findMany();
    const itemMap = new Map(items.map(i => [i.id, i]));

    console.log('--- MAPEOS ACTUALES EN BD ---');
    for (const m of mapeos) {
        const it = itemMap.get(m.reactivo_id);
        console.log(ID:  | Prueba:  | Reactivo ID:  () | Equipo:  | Patrón: [] | Consumo:  ml);
    }
}

main().catch(console.error).finally(() => prisma.());
