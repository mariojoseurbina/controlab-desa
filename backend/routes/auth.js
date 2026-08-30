// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const { verifyToken } = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

router.post('/login', login);
router.get('/verify', authMiddleware, verifyToken);

module.exports = router;