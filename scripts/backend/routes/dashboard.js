const express = require('express');
const { getDashboardMetrics } = require('../controllers/dashboardController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/metrics', auth, getDashboardMetrics);

module.exports = router;