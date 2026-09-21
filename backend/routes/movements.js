const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');
const {
  getAllMovements,
  createMovement,
  transferStock,
  downloadTransferPdf,
  cargaMasivaInicial
} = require('../controllers/movementsController');

const router = express.Router();

router.get('/', optionalAuth, getAllMovements);
router.post('/', authenticateToken, createMovement);
router.post('/transfer', authenticateToken, transferStock);
router.post('/carga-inicial-masiva', authenticateToken, cargaMasivaInicial);
// Ruta pública/directa para descarga cómoda del comprobante PDF en navegador
router.get('/transfer/pdf', downloadTransferPdf);

module.exports = router;