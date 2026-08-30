const pruebasService = require('../services/pruebasService');
const fs = require('fs');

const importarMasivo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se ha proporcionado ningún archivo' });
    }

    const resultados = await pruebasService.ejecutarImportacionMasiva(req.file.path, req.user?.id || 1);
    
    // Limpiar archivo temporal
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Importación completada: ${resultados.exitosas} tipos de prueba procesados`,
      data: resultados
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Error en importación masiva:', error);
    res.status(500).json({ success: false, error: `Error en la importación: ${error.message}` });
  }
};

const procesarPruebaIndividual = async (req, res) => {
  try {
    const { codigo_kit, cantidad, observaciones } = req.body;
    const resultado = await pruebasService.procesarPruebaIndividual(codigo_kit, cantidad, observaciones, req.user?.id || 1);
    res.json({ success: true, message: 'Prueba procesada exitosamente', data: resultado });
  } catch (error) {
    console.error('Error al procesar prueba:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

const obtenerCapacidad = async (req, res) => {
  try {
    const data = await pruebasService.obtenerCapacidadKit(req.params.codigo_kit);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error al calcular capacidad:', error);
    res.status(error.message.includes('No encontrado') ? 404 : 500).json({ success: false, error: error.message });
  }
};

const obtenerHistorial = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, page, limit } = req.query;
    const data = await pruebasService.obtenerHistorial(fecha_inicio, fecha_fin, page, limit);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ success: false, error: 'Error al obtener el historial de pruebas' });
  }
};

module.exports = {
  importarMasivo,
  procesarPruebaIndividual,
  obtenerCapacidad,
  obtenerHistorial
};
