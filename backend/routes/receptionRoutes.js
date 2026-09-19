const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { getSuppliers, createSupplier, getReceptions, createReception, createBatchReception } = require('../controllers/receptionController');

const router = express.Router();

router.get('/', authenticateToken, getReceptions);
router.post('/', authenticateToken, createReception);
router.post('/batch', authenticateToken, createBatchReception);
router.get('/suppliers', authenticateToken, getSuppliers);
router.post('/suppliers', authenticateToken, createSupplier);

module.exports = router;
