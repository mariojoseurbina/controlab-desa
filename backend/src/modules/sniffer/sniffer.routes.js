const express = require('express');
const router = express.Router();
const snifferController = require('./sniffer.controller');
const { authenticateToken } = require('../../../middleware/authMiddleware');

// Webhook para recibir datos del Sniffer .exe (red local)
router.post('/webhook', snifferController.webhookSniffer);

// Ruta protegida con JWT para que solo usuarios autorizados vean pacientes y pruebas
router.get('/logs', authenticateToken, snifferController.getSnifferLogs);

module.exports = router;
