const dashboardService = require('../services/dashboardService');

const getDashboardMetrics = async (req, res) => {
  try {
    console.log('📊 Obteniendo métricas del dashboard...');
    const data = await dashboardService.getMetrics();
    console.log('✅ Métricas obtenidas correctamente');
    res.json(data);
  } catch (error) {
    console.error('❌ Error obteniendo métricas del dashboard:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getStockChartData = async (req, res) => {
  try {
    const data = await dashboardService.getStockChartData();
    res.json(data);
  } catch (error) {
    console.error('Error obteniendo datos del gráfico:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getCategoryDistribution = async (req, res) => {
  try {
    console.log('📊 GET /api/dashboard/category-distribution - Solicitado');
    const data = await dashboardService.getCategoryDistribution();
    console.log('✅ Distribución por categoría obtenida:', data.length, 'filas');
    res.json(data);
  } catch (error) {
    console.error('❌ Error en getCategoryDistribution:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getWeeklyMovements = async (req, res) => {
  try {
    console.log('📊 GET /api/dashboard/weekly-movements - Solicitado');
    const data = await dashboardService.getWeeklyMovements();
    console.log('✅ Movimientos semanales obtenidos:', data);
    res.json(data);
  } catch (error) {
    console.error('❌ Error en getWeeklyMovements:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getDashboardMetrics,
  getStockChartData,
  getCategoryDistribution,
  getWeeklyMovements
};