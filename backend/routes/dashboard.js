const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { getDashboardMetrics, getStockChartData, getCategoryDistribution, getWeeklyMovements } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/metrics', authenticateToken, getDashboardMetrics);
router.get('/stock-chart', authenticateToken, getStockChartData);
router.get('/category-distribution', authenticateToken, getCategoryDistribution);
router.get('/weekly-movements', authenticateToken, getWeeklyMovements);

module.exports = router;