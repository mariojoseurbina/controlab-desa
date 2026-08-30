const reportService = require('../services/reportService');

const generateStockReport = async (req, res) => {
  try {
    const report = await reportService.getPreciosResumen();
    res.json(report);
  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getPreciosInventario = async (req, res) => {
  try {
    const data = await reportService.getPreciosInventario();
    res.json({ success: true, ...data, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error en reporte precios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPreciosResumen = async (req, res) => {
  try {
    const resumen = await reportService.getPreciosResumen();
    res.json({ success: true, resumen, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error en reporte resumen precios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getReactivosLotes = async (req, res) => {
  try {
    const data = await reportService.getReactivosLotes();
    res.json({ success: true, data: { ...data, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('Error en reporte reactivos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const exportarExcelPrecios = async (req, res) => {
  try {
    const buffer = await reportService.getPreciosExcelBuffer();
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_precios_inventario.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exportando Excel precios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const exportarExcelIA = async (req, res) => {
  try {
    const { datos, nombreReporte } = req.body;
    if (!datos || !Array.isArray(datos)) {
      return res.status(400).json({ success: false, error: 'Datos inválidos para exportar' });
    }
    const buffer = reportService.generateExcelBuffer(datos, "Reporte IA");
    const nombreArchivo = nombreReporte ? `reporte_${nombreReporte.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx` : 'reporte_ia.xlsx';
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exportando IA Excel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  generateStockReport,
  getPreciosInventario,
  getPreciosResumen,
  getReactivosLotes,
  exportarExcelPrecios,
  exportarExcelIA
};