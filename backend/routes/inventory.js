const express = require('express');
const {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
} = require('../controllers/inventoryController');

const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getAllItems);
router.get('/:id', getItemById);
router.post('/', authenticateToken, createItem);
router.put('/:id', authenticateToken, updateItem);
router.delete('/:id', authenticateToken, deleteItem);

module.exports = router;