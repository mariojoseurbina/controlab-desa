const express = require('express');
const router = express.Router();
const almacenesController = require('./almacenes.controller');
const { authenticateToken } = require('../../../middleware/authMiddleware');

router.get('/', almacenesController.listarAlmacenes);
router.get('/stock-summary', authenticateToken, almacenesController.obtenerStockSummary);
router.get('/:id', almacenesController.obtenerAlmacen);
router.post('/', almacenesController.crearAlmacen);

module.exports = router;
