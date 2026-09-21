const express = require('express');
const { optionalAuth } = require('../middleware/authMiddleware');
const { getDashboardMetrics, getStockChartData, getCategoryDistribution, getWeeklyMovements } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/metrics', optionalAuth, getDashboardMetrics);
router.get('/stock-chart', optionalAuth, getStockChartData);
router.get('/category-distribution', optionalAuth, getCategoryDistribution);
router.get('/weekly-movements', optionalAuth, getWeeklyMovements);

module.exports = router;