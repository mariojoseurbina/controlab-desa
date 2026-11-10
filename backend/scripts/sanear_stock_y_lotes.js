/**
 * SCRIPT INSTITUCIONAL CONTROLAB: RECALIBRACIÓN Y SANEAMIENTO DE STOCK Y LOTES
 * Aplica en producción las reglas aprobadas:
 * 1. Marca como 'Agotado' cajas cerradas con CantidadActual <= 0 (elimina lotes fantasmas en Central).
 * 2. Normaliza remanentes negativos a 0 mL en cajas activas.
 * 3. Sincroniza stock_por_almacen de Almacén Laboratorio (id = 2) para reflejar
 *    estrictamente las cajas cerradas en reserva (nevera).
 * 4. Ajusta stock consolidado en items_inventario (Central + Lab nevera).
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ejecutarSaneamiento() {
  console.log('========================================================================');
  console.log('🚀 [CONTROLAB] Iniciando Recalibración y Cuadratura Histórica de Stock...');
  console.log('========================================================================\n');

  try {
    // 1. Normalizar lotes cerrados con CantidadActual <= 0 a 'Agotado'
    const cerradosCero = await prisma.lotesReactivos.updateMany({
      where: {
        CantidadActual: { lte: 0 },
        FechaApertura: null,
        Estado: { not: 'Agotado' }
      },
      data: {
        Estado: 'Agotado'
      }
    });
    console.log(`✅ [1/4] Lotes cerrados con saldo <= 0 archivados como 'Agotado': ${cerradosCero.count}`);

    // 2. Normalizar lotes activos con remanente negativo
    const negativos = await prisma.lotesReactivos.updateMany({
      where: {
        CantidadActual: { lt: 0 }
      },
      data: {
        CantidadActual: 0,
        PruebasRestantes: 0
      }
    });
    console.log(`✅ [2/4] Cajas activas con saldo negativo por Sniffer corregidas a 0 mL: ${negativos.count}`);

    // 3. Sincronizar stock_por_almacen de Almacén Laboratorio (id = 2) con cajas cerradas en nevera
    const items = await prisma.itemInventario.findMany({
      where: { activo: true },
      include: {
        LotesReactivos: true,
        stock_sucursales: true
      }
    });

    let sincroCount = 0;
    for (const item of items) {
      const lotes = item.LotesReactivos || [];
      if (lotes.length === 0) continue; // Insumos sin lotes no se tocan

      const cerradasLab = lotes.filter(l => 
        !l.FechaApertura && 
        (l.Estado === 'Cerrado' || l.Estado === 'CERRADO') &&
        (l.estado_transferencia === 'RECIBIDO_LABORATORIO' || l.estado_transferencia === 'LABORATORIO' || l.almacen_destino_id === 2) &&
        Number(l.CantidadActual) > 0
      );

      const stockLabRecord = item.stock_sucursales.find(s => s.almacen_id === 2);
      const stockDeseado = cerradasLab.length;

      if (stockLabRecord) {
        if (Number(stockLabRecord.stock_actual) !== stockDeseado) {
          await prisma.stockPorAlmacen.update({
            where: { id: stockLabRecord.id },
            data: { stock_actual: stockDeseado }
          });
          sincroCount++;
        }
      } else if (stockDeseado > 0) {
        await prisma.stockPorAlmacen.create({
          data: {
            item_id: item.id,
            almacen_id: 2,
            stock_actual: stockDeseado
          }
        });
        sincroCount++;
      }

      // 4. Actualizar stock global del item master: Central + Lab (cajas cerradas en reserva)
      const stockCentralRecord = item.stock_sucursales.find(s => s.almacen_id === 1);
      const stockCentral = stockCentralRecord ? Number(stockCentralRecord.stock_actual) : 0;
      const stockGlobalDeseado = stockCentral + stockDeseado;

      if (Number(item.stock_actual) !== stockGlobalDeseado) {
        await prisma.itemInventario.update({
          where: { id: item.id },
          data: { stock_actual: stockGlobalDeseado }
        });
      }
    }

    console.log(`✅ [3/4] Registros de stock de Laboratorio (Nevera) sincronizados: ${sincroCount}`);
    console.log(`✅ [4/4] Stock consolidado global sincronizado en items_inventario.`);
    console.log('\n========================================================================');
    console.log('🎉 [ÉXITO] Base de datos del cliente calibrada y 100% consonante.');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('❌ Error durante la calibración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

ejecutarSaneamiento();
