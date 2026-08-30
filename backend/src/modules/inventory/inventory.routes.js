const express = require('express');
const router = express.Router();
const inventoryController = require('./inventory.controller');

router.get('/', inventoryController.getInventory);
router.post('/', inventoryController.createItem);
router.put('/:id', inventoryController.updateItem);
router.delete('/:id', inventoryController.deleteItem);

module.exports = router;
