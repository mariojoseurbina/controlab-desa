const express = require('express');
const router = express.Router();
const { getAuditLog } = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Solo usuarios autenticados pueden ver la auditoría
router.get('/', authenticateToken, getAuditLog);

module.exports = router;
