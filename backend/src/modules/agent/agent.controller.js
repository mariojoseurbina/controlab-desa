const agentService = require('./agent.service');

const processMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'El mensaje es requerido.' });
    }

    const result = await agentService.processChat(message);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error en el controlador del agente:', error);
    
    // Si el error es por falta de API Key, devolver un mensaje claro
    if (error.message.includes('GROQ_API_KEY')) {
       return res.status(500).json({ 
          error: 'Falta la clave API de Groq.', 
          detalles: 'Por favor, configura GROQ_API_KEY en tu archivo .env'
       });
    }

    return res.status(500).json({ 
      error: 'Error procesando la solicitud con el Agente de IA',
      detalles: error.message 
    });
  }
};

module.exports = {
  processMessage
};
