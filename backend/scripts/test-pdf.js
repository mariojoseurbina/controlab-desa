const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function test() {
  const referencia = 'TRANS-157';
  console.log(`🧪 Probando generación de PDF para la referencia: ${referencia}...`);

  try {
    const movements = await prisma.movimientoInventario.findMany({
      where: {
        referencia: referencia,
        tipo_movimiento: 'TRANSFERENCIA'
      },
      include: {
        almacen: { select: { nombre: true } },
        almacen_destino: { select: { nombre: true } }
      }
    });

    console.log(`📊 Movimientos encontrados: ${movements.length}`);
    if (movements.length === 0) {
      console.log('❌ No hay movimientos en la base de datos para esta referencia.');
      return;
    }

    const itemIds = movements.map(m => m.item_id);
    const items = await prisma.itemInventario.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, nombre: true, codigo: true, unidad: true }
    });
    const itemMap = new Map(items.map(i => [i.id, i]));

    const origin = movements[0].almacen?.nombre || 'Almacén Origen';
    const destination = movements[0].almacen_destino?.nombre || 'Almacén Destino';
    
    // Generar archivo físico local en la carpeta scratch/
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const outputDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, `test_transfer_${referencia}.pdf`);
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Diseño del PDF
    doc.rect(50, 45, 512, 15).fill('#0f766e');
    doc.fillColor('#1e293b').fontSize(22).text('CONTROLAB - LIMS VET / IA', 50, 75, { bold: true });
    doc.fontSize(10).fillColor('#64748b').text('COMPROBANTE OFICIAL DE TRANSFERENCIA DE SUMINISTROS', 50, 100);
    doc.moveTo(50, 115).lineTo(562, 115).stroke('#cbd5e1');

    doc.fillColor('#1e293b').fontSize(11);
    doc.text(`Referencia de Envío: `, 50, 130, { bold: true, continued: true }).fillColor('#0f766e').text(referencia);
    doc.fillColor('#1e293b');
    doc.text(`Almacén de Origen: `, 50, 160, { bold: true, continued: true }).text(origin, { bold: false });
    doc.text(`Sucursal de Destino: `, 50, 175, { bold: true, continued: true }).text(destination, { bold: false });

    const tableTop = 210;
    doc.rect(50, tableTop, 512, 20).fill('#f1f5f9');
    doc.fillColor('#334155').fontSize(10).text('Código', 60, tableTop + 5, { bold: true });
    doc.text('Descripción del Reactivo / Artículo', 160, tableTop + 5, { bold: true });
    doc.text('Cantidad Enviada', 430, tableTop + 5, { bold: true, align: 'right' });

    let currentY = tableTop + 20;
    movements.forEach((mov) => {
      const item = itemMap.get(mov.item_id) || {};
      doc.fillColor('#1e293b').fontSize(9);
      doc.text(item.codigo || 'N/A', 60, currentY + 6);
      doc.text(item.nombre || 'Desconocido', 160, currentY + 6);
      doc.text(`${Number(mov.cantidad)} ${item.unidad || 'U'}`, 430, currentY + 6, { align: 'right' });
      doc.moveTo(50, currentY + 20).lineTo(562, currentY + 20).stroke('#f1f5f9');
      currentY += 20;
    });

    const signatureY = currentY + 80;
    doc.fillColor('#64748b').fontSize(10);
    doc.moveTo(80, signatureY).lineTo(230, signatureY).stroke('#94a3b8');
    doc.text('Despachado por (Central)', 80, signatureY + 5, { align: 'center', width: 150 });
    doc.moveTo(380, signatureY).lineTo(530, signatureY).stroke('#94a3b8');
    doc.text('Recibido conforme (Sucursal)', 380, signatureY + 5, { align: 'center', width: 150 });

    doc.end();

    stream.on('finish', () => {
      console.log(`✅ ¡PDF generado con éxito en ${outputPath}!`);
    });
  } catch (err) {
    console.error('❌ Error ejecutando prueba de PDF:', err);
  }
}

test().finally(() => prisma.$disconnect());
