import api from './api';

export const reportService = {
  generateReport: async (reportType, filters = {}) => {
    const response = await api.get('/reports', { 
      params: { tipo: reportType, ...filters } 
    });
    return response.data;
  },

  exportReport: async (exportData) => {
    const response = await api.post('/reports/export', exportData, {
      responseType: 'blob'
    });
    return response.data;
  }
};