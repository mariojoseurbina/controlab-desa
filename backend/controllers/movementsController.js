const movementsService = require('../services/movementsService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');

const getAllMovements = async (req, res) => {
  try {
    const { almacenId } = req.query;
    const movements = await movementsService.getAllMovements(almacenId);
    res.json({ movements });
  } catch (error) {
    console.error('Error obteniendo movimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
};

const createMovement = async (req, res) => {
  try {
    const result = await movementsService.createMovement(req.body, req.user?.id || 6);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creando movimiento:', error);
    if (error.message.includes('insuficiente') || error.message.includes('obligatorios')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
};

const transferStock = async (req, res) => {
  try {
    console.log('🚛 Solicitando transferencia de stock:', req.body);
    const result = await movementsService.transferStock(req.body, req.user?.id || 6);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error realizando transferencia:', error);
    res.status(400).json({ error: error.message });
  }
};

const downloadTransferPdf = async (req, res) => {
  try {
    const { referencia } = req.query;
    if (!referencia) {
      return res.status(400).json({ error: 'La referencia es requerida' });
    }

    console.log(`📄 Generando PDF para referencia de transferencia: ${referencia}...`);

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

    if (movements.length === 0) {
      return res.status(404).json({ error: 'No se encontraron transferencias con la referencia especificada' });
    }

    const itemIds = movements.map(m => m.item_id);
    const items = await prisma.itemInventario.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, nombre: true, codigo: true, unidad: true, presentacion: true, equipo_asociado: true }
    });
    const itemMap = new Map(items.map(i => [i.id, i]));

    const origin = movements[0].almacen?.nombre || 'Almacén Origen';
    const destination = movements[0].almacen_destino?.nombre || 'Almacén Destino';
    const dateStr = movements[0].fecha_movimiento
      ? new Date(movements[0].fecha_movimiento).toLocaleString('es-VE')
      : new Date().toLocaleString('es-VE');

    // Crear PDF
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    res.setHeader('Content-disposition', `attachment; filename="Comprobante_Transferencia_${referencia}.pdf"`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Dibujar diseño premium del PDF
    doc.rect(50, 45, 512, 15).fill('#0f766e'); // Teal header bar
    
    // Título y Subtítulo
    doc.fillColor('#1e293b').fontSize(22).text('CONTROLAB - LIMS VET / IA', 50, 75, { bold: true });
    doc.fontSize(10).fillColor('#64748b').text('COMPROBANTE OFICIAL DE TRANSFERENCIA DE SUMINISTROS', 50, 100);
    
    // Línea separadora
    doc.strokeColor('#cbd5e1').moveTo(50, 115).lineTo(562, 115).stroke();

    // Metadatos
    doc.fillColor('#1e293b').fontSize(11);
    doc.text(`Referencia de Envío: `, 50, 130, { bold: true, continued: true }).fillColor('#0f766e').text(referencia);
    doc.fillColor('#1e293b');
    doc.text(`Fecha de Emisión: ${dateStr}`, 50, 145);
    doc.text(`Almacén de Origen: `, 50, 160, { bold: true, continued: true }).text(origin, { bold: false });
    doc.text(`Sucursal de Destino: `, 50, 175, { bold: true, continued: true }).text(destination, { bold: false });

    // Encabezado de la tabla de ítems
    const tableTop = 210;
    doc.rect(50, tableTop, 512, 22).fill('#f1f5f9');
    doc.fillColor('#334155').fontSize(9).text('Código', 55, tableTop + 6, { bold: true });
    doc.text('Descripción del Producto', 140, tableTop + 6, { bold: true });
    doc.text('Presentación Comercial', 335, tableTop + 6, { bold: true });
    doc.text('Cantidad', 460, tableTop + 6, { bold: true, align: 'right', width: 95 });

    let currentY = tableTop + 24;

    // Listar las líneas de transferencia
    movements.forEach((mov) => {
      const item = itemMap.get(mov.item_id) || {};
      const code = item.codigo || 'N/A';
      const name = item.nombre || 'Producto no especificado';
      const presentacion = item.presentacion || 'N/A';
      const unit = item.unidad || 'Caja(s)';
      const qty = Number(mov.cantidad);

      doc.fillColor('#1e293b').fontSize(8.5);
      doc.text(code, 55, currentY + 6, { width: 80 });
      doc.text(name, 140, currentY + 6, { width: 190 });
      doc.fillColor('#0369a1').text(presentacion, 335, currentY + 6, { width: 120 });
      doc.fillColor('#1e293b').text(`${qty} ${unit}`, 460, currentY + 6, { align: 'right', width: 95 });

      // Línea fina para fila de tabla
      doc.strokeColor('#e2e8f0').moveTo(50, currentY + 22).lineTo(562, currentY + 22).stroke();
      currentY += 24;
    });

    // Zona de firmas
    const signatureY = currentY + 80;
    doc.fillColor('#64748b').fontSize(10);
    
    // Firma de origen (Central)
    doc.strokeColor('#94a3b8').moveTo(80, signatureY).lineTo(230, signatureY).stroke();
    doc.text('Despachado por (Central)', 80, signatureY + 5, { align: 'center', width: 150 });
    
    // Firma de destino (Sucursal)
    doc.strokeColor('#94a3b8').moveTo(380, signatureY).lineTo(530, signatureY).stroke();
    doc.text('Recibido conforme (Sucursal)', 380, signatureY + 5, { align: 'center', width: 150 });

    doc.end();

  } catch (error) {
    console.error('Error generando comprobante PDF:', error);
    res.status(500).json({ error: 'Error interno al generar comprobante PDF: ' + error.message });
  }
};

const cargaMasivaInicial = async (req, res) => {
  try {
    const result = await movementsService.cargaMasivaInicial(req.body, req.user?.id || 1);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error en carga masiva inicial:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllMovements,
  createMovement,
  transferStock,
  downloadTransferPdf,
  cargaMasivaInicial
};