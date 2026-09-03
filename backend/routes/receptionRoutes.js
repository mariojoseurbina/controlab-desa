const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { getSuppliers, createSupplier, getReceptions, createReception } = require('../controllers/receptionController');

const router = express.Router();

router.get('/', authenticateToken, getReceptions);
router.post('/', authenticateToken, createReception);
router.get('/suppliers', authenticateToken, getSuppliers);
router.post('/suppliers', authenticateToken, createSupplier);

module.exports = router;
