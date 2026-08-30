const express = require('express');
const router = express.Router();
const {
  getAllLotes,
  getLoteById,
  createLote,
  updateLote,
  deleteLote,
  getLotesByReactivo
} = require('../controllers/lotsController');

const { authenticateToken } = require('../middleware/authMiddleware');

// Rutas para lotes
router.get('/', getAllLotes);
router.get('/:id', getLoteById);
router.post('/', authenticateToken, createLote);
router.put('/:id', authenticateToken, updateLote);
router.delete('/:id', authenticateToken, deleteLote);
router.get('/reactivo/:reactivoId', getLotesByReactivo);

module.exports = router;