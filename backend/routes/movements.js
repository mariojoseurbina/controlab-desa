const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getAllMovements,
  createMovement,
  transferStock,
  downloadTransferPdf
} = require('../controllers/movementsController');

const router = express.Router();

router.get('/', authenticateToken, getAllMovements);
router.post('/', authenticateToken, createMovement);
router.post('/transfer', authenticateToken, transferStock);
// Ruta pública/directa para descarga cómoda del comprobante PDF en navegador
router.get('/transfer/pdf', downloadTransferPdf);

module.exports = router;