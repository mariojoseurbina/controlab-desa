const express = require('express');
const router = express.Router();
const snifferController = require('./sniffer.controller');

// Ruta para recibir los datos del Sniffer .exe (Webhook)
router.post('/webhook', snifferController.webhookSniffer);

// Ruta para que el Frontend consuma los logs y los muestre
router.get('/logs', snifferController.getSnifferLogs);

module.exports = router;
