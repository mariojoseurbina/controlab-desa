const aiService = require('./ai.service');

class AiController {
  async analyze(req, res) {
    try {
      const { pregunta } = req.body;
      console.log('🤖 Pregunta recibida (Screaming Arch):', pregunta);

      const resultado = await aiService.analyzeQuestion(pregunta || '');

      res.json({
        pregunta,
        respuesta: resultado.respuesta,
        datos: resultado.datos,
        tipo: resultado.tipo
      });
    } catch (error) {
      console.error('❌ Error en análisis IA:', error.message);
      res.status(500).json({ error: 'Error en el análisis: ' + error.message });
    }
  }
}

module.exports = new AiController();
