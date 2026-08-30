import api from './api';

export const dashboardService = {
  async getDashboardMetrics() {
    const response = await api.get('/dashboard/metrics');
    return response.data;
  },

  async getStockByCategory() {
    const response = await api.get('/dashboard/category-distribution');
    return response.data;
  },

  async getWeeklyMovementsSummary() {
    const response = await api.get('/dashboard/weekly-movements');
    return response.data;
  },

  async getDailyMovements() {
    const response = await api.get('/dashboard/weekly-movements');
    return response.data;
  }
};