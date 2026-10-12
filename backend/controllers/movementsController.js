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


const downloadReceptionPdf = async (req, res) => {
    try {
      const { referencia, action } = req.query;
      if (!referencia) {
        return res.status(400).json({ error: 'La referencia es requerida' });
      }
  
      console.log(`[PDF] Generando PDF de ${action || 'RECEPCION'} masiva para referencia: ${referencia}...`);
  
      const movements = await prisma.movimientoInventario.findMany({
        where: { referencia: referencia },
        include: {
          almacen: { select: { nombre: true } },
          almacen_destino: { select: { nombre: true } }
        }
      });
  
      if (movements.length === 0) {
        return res.status(404).json({ error: 'No se encontraron registros con la referencia especificada' });
      }
  
      const itemIds = movements.map(m => m.item_id);
      const items = await prisma.itemInventario.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, nombre: true, codigo: true, presentacion: true }
      });
      const itemMap = new Map(items.map(i => [i.id, i]));
  
      const dateStr = movements[0].fecha_movimiento
        ? new Date(movements[0].fecha_movimiento).toLocaleString('es-VE')
        : new Date().toLocaleString('es-VE');
  
      const isRechazo = action === 'RECHAZAR';
      const title = isRechazo ? 'ACTA DE RECHAZO Y DEVOLUCIN' : 'ACTA DE RECEPCIN Y CONFORMIDAD';
      const colorTheme = isRechazo ? '#b91c1c' : '#047857'; // Red vs Green
  
      // Crear PDF
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      res.setHeader('Content-disposition', `attachment; filename="Acta_${isRechazo ? 'Rechazo' : 'Recepcion'}_${referencia}.pdf"`);
      res.setHeader('Content-type', 'application/pdf');
      doc.pipe(res);
  
      // Header bar
      doc.rect(50, 45, 512, 15).fill(colorTheme);
      
      // Titles
      doc.fillColor('#1e293b').fontSize(22).text('CONTROLAB - LIMS VET / IA', 50, 75, { bold: true });
      doc.fontSize(12).fillColor('#64748b').text(title, 50, 100);
      
      // Separator
      doc.strokeColor('#cbd5e1').moveTo(50, 115).lineTo(562, 115).stroke();
  
      // Meta
      doc.fillColor('#1e293b').fontSize(11);
      doc.text(`Cdigo de Referencia: `, 50, 130, { bold: true, continued: true }).fillColor(colorTheme).text(referencia);
      doc.fillColor('#1e293b');
      doc.text(`Fecha de Emisin: ${dateStr}`, 50, 145);
      doc.text(`Sucursal Validadora: Laboratorio Central`, 50, 160);
      doc.text(`Estatus de Operacin: `, 50, 175, { bold: true, continued: true }).fillColor(colorTheme).text(isRechazo ? 'RECHAZADO Y DEVUELTO ALMACN' : 'CONFORME, INGRESADO A RESERVA DE NEVERA');
  
      // Table Header
      const tableTop = 210;
      doc.rect(50, tableTop, 512, 22).fill('#f1f5f9');
      doc.fillColor('#334155').fontSize(9).text('Cdigo', 55, tableTop + 6, { bold: true });
      doc.text('Descripcin del Producto', 140, tableTop + 6, { bold: true });
      doc.text('Presentacin', 335, tableTop + 6, { bold: true });
      doc.text('Cant. Cajas', 460, tableTop + 6, { bold: true, align: 'right', width: 95 });
  
      let currentY = tableTop + 24;
  
      movements.forEach((mov) => {
        const item = itemMap.get(mov.item_id) || {};
        const code = item.codigo || 'N/A';
        const name = item.nombre || 'Producto Desconocido';
        const presentacion = item.presentacion || 'Caja';
        const qty = Number(mov.cantidad);
  
        doc.fillColor('#1e293b').fontSize(8.5);
        doc.text(code, 55, currentY + 6, { width: 80 });
        doc.text(name, 140, currentY + 6, { width: 190 });
        doc.text(presentacion, 335, currentY + 6, { width: 120 });
        doc.fillColor(colorTheme).text(`${qty} Caja(s)`, 460, currentY + 6, { align: 'right', width: 95 });
  
        doc.strokeColor('#e2e8f0').moveTo(50, currentY + 22).lineTo(562, currentY + 22).stroke();
        currentY += 24;
      });
  
      // Footer Signatures
      const signatureY = currentY + 80;
      doc.fillColor('#64748b').fontSize(10);
      
      doc.strokeColor('#94a3b8').moveTo(100, signatureY).lineTo(250, signatureY).stroke();
      doc.text('Bioanalista Receptor', 100, signatureY + 5, { align: 'center', width: 150 });
      
      doc.strokeColor('#94a3b8').moveTo(350, signatureY).lineTo(500, signatureY).stroke();
      doc.text('Sello de Laboratorio', 350, signatureY + 5, { align: 'center', width: 150 });
  
      doc.end();
    } catch (error) {
      console.error('[PDF] Error generando pdf de recepcion:', error);
      res.status(500).json({ error: error.message });
    }
};

const getLotesDisponibles = async (req, res) => {
  try {
    const { item_id, almacen_id } = req.query;
    if (!item_id) {
      return res.status(400).json({ error: 'item_id es requerido' });
    }
    const itemIdNum = parseInt(item_id, 10);
    const almId = parseInt(almacen_id || 1, 10);

    const lotes = await prisma.lotesReactivos.findMany({
      where: {
        InventarioId: itemIdNum,
        ...(almId === 1 ? {
          OR: [
            { estado_transferencia: 'ALMACEN_CENTRAL' },
            { estado_transferencia: null }
          ]
        } : {}),
        CantidadActual: { gt: 0 }
      },
      orderBy: { FechaVencimiento: 'asc' }
    });

    const data = lotes.map(l => ({
      id: l.Id,
      lote_id: l.Id,
      numero_lote: l.NumeroLote,
      numeroLote: l.NumeroLote,
      cajas_disponibles: Number(l.CantidadActual) || 0,
      cantidadDisponible: Number(l.CantidadActual) || 0,
      fecha_vencimiento: l.FechaVencimiento,
      fechaVencimiento: l.FechaVencimiento,
      fechaFabricacion: l.FechaFabricacion
    }));

    res.json({ success: true, lotes: data });
  } catch (error) {
    console.error('Error obteniendo lotes disponibles:', error);
    res.status(500).json({ error: error.message });
  }
};

const downloadMovementPdf = async (req, res) => {
  try {
    const { referencia } = req.query;
    if (!referencia) {
      return res.status(400).json({ error: 'La referencia es requerida' });
    }

    const movements = await prisma.movimientoInventario.findMany({
      where: { referencia },
      include: {
        almacen: { select: { nombre: true } }
      }
    });

    if (movements.length === 0) {
      return res.status(404).json({ error: 'No se encontraron movimientos con la referencia especificada' });
    }

    const itemIds = movements.map(m => m.item_id);
    const items = await prisma.itemInventario.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, nombre: true, codigo: true, unidad: true, presentacion: true, equipo_asociado: true }
    });
    const itemMap = new Map(items.map(i => [i.id, i]));

    const movType = movements[0].tipo_movimiento || 'SALIDA';
    const origin = movements[0].almacen?.nombre || 'Almacén Central';
    const dateStr = movements[0].fecha_movimiento
      ? new Date(movements[0].fecha_movimiento).toLocaleString('es-VE')
      : new Date().toLocaleString('es-VE');

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    res.setHeader('Content-disposition', `attachment; filename="Comprobante_${movType}_${referencia}.pdf"`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    const isExit = movType === 'SALIDA' || movType === 'MERMA';
    const headerColor = isExit ? '#dc2626' : '#16a34a';

    doc.rect(50, 45, 512, 15).fill(headerColor);
    doc.fillColor('#1e293b').fontSize(22).text('CONTROLAB - LIMS VET / IA', 50, 75, { bold: true });
    doc.fontSize(10).fillColor('#64748b').text(`COMPROBANTE OFICIAL DE MOVIMIENTO DE INVENTARIO (${movType})`, 50, 100);
    doc.strokeColor('#cbd5e1').moveTo(50, 115).lineTo(562, 115).stroke();

    doc.fillColor('#1e293b').fontSize(11);
    doc.text(`Nro de Referencia: `, 50, 130, { bold: true, continued: true }).fillColor(headerColor).text(referencia);
    doc.fillColor('#1e293b');
    doc.text(`Fecha de Emisión: ${dateStr}`, 50, 145);
    doc.text(`Almacén: `, 50, 160, { bold: true, continued: true }).text(origin, { bold: false });
    doc.text(`Motivo / Concepto: `, 50, 175, { bold: true, continued: true }).text(movements[0].motivo || 'N/A', { bold: false });

    const tableTop = 210;
    doc.rect(50, tableTop, 512, 22).fill('#f1f5f9');
    doc.fillColor('#334155').fontSize(9).text('Código', 55, tableTop + 6, { bold: true });
    doc.text('Descripción del Producto', 140, tableTop + 6, { bold: true });
    doc.text('Presentación Comercial', 335, tableTop + 6, { bold: true });
    doc.text('Cantidad', 460, tableTop + 6, { bold: true, align: 'right', width: 95 });

    let currentY = tableTop + 24;
    let totalQty = 0;
    movements.forEach((mov) => {
      const item = itemMap.get(mov.item_id) || {};
      const code = item.codigo || 'N/A';
      const name = item.nombre || 'Producto no especificado';
      const presentacion = item.presentacion || 'N/A';
      const unit = item.unidad || 'Caja(s)';
      const qty = Number(mov.cantidad);
      totalQty += qty;

      doc.fillColor('#1e293b').fontSize(8.5);
      doc.text(code, 55, currentY + 6, { width: 80 });
      doc.text(name, 140, currentY + 6, { width: 190 });
      doc.fillColor('#0369a1').text(presentacion, 335, currentY + 6, { width: 120 });
      doc.fillColor('#1e293b').text(`${qty} ${unit}`, 460, currentY + 6, { align: 'right', width: 95 });

      doc.strokeColor('#e2e8f0').moveTo(50, currentY + 22).lineTo(562, currentY + 22).stroke();
      currentY += 24;
    });

    doc.rect(50, currentY, 512, 20).fill('#f8fafc');
    doc.fillColor('#0f172a').fontSize(9).text(`TOTAL GENERAL: ${movements.length} ÍTEMS REGISTRADOS`, 55, currentY + 5, { bold: true });
    doc.text(`${totalQty} Total Cajas/Unidades`, 460, currentY + 5, { bold: true, align: 'right', width: 95 });
    currentY += 30;

    const signatureY = Math.max(currentY + 60, 620);
    doc.fillColor('#64748b').fontSize(10);
    doc.strokeColor('#94a3b8').moveTo(80, signatureY).lineTo(230, signatureY).stroke();
    doc.text('Entregado por / Responsable', 80, signatureY + 5, { align: 'center', width: 150 });

    doc.strokeColor('#94a3b8').moveTo(330, signatureY).lineTo(480, signatureY).stroke();
    doc.text('Recibido por / Conforme', 330, signatureY + 5, { align: 'center', width: 150 });

    doc.end();
  } catch (error) {
    console.error('[PDF] Error generando pdf de movimiento:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllMovements,
  createMovement,
  transferStock,
  downloadTransferPdf,
  downloadMovementPdf,
  cargaMasivaInicial,
  downloadReceptionPdf,
  getLotesDisponibles
};