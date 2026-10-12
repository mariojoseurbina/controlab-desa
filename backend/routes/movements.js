const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');
const {
  getAllMovements,
  createMovement,
  transferStock,
  downloadTransferPdf,
  downloadMovementPdf,
  downloadReceptionPdf,
  cargaMasivaInicial,
  getLotesDisponibles
} = require('../controllers/movementsController');

const router = express.Router();

router.get('/', optionalAuth, getAllMovements);
router.get('/lotes-disponibles', optionalAuth, getLotesDisponibles);
router.post('/', authenticateToken, createMovement);
router.post('/transfer', authenticateToken, transferStock);
router.post('/carga-inicial-masiva', authenticateToken, cargaMasivaInicial);
// Ruta publica/directa para descarga comoda del comprobante PDF en navegador
router.get('/transfer/pdf', downloadTransferPdf);
router.get('/movement/pdf', downloadMovementPdf);
router.get('/reception/pdf', downloadReceptionPdf);

module.exports = router;