const express = require('express');
const router = express.Router();
const agentController = require('./agent.controller');

// Ruta principal para interactuar con el agente
// POST /api/agent/chat
router.post('/chat', agentController.processMessage);

module.exports = router;
