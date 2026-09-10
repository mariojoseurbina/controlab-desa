const express = require('express');
const router = express.Router();
const inventoryController = require('./inventory.controller');
const { authenticateToken, optionalAuth } = require('../../../middleware/authMiddleware');

// Lectura de catálogo disponible con o sin token para evitar bloqueos en frontend
router.get('/', optionalAuth, inventoryController.getInventory);

// Modificaciones estrictamente protegidas
router.post('/', authenticateToken, inventoryController.createItem);
router.put('/:id', authenticateToken, inventoryController.updateItem);
router.delete('/:id', authenticateToken, inventoryController.deleteItem);

module.exports = router;
