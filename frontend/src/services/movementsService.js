import api from './api';

export const movementsService = {
  async getAllMovements(params = {}) {
    const response = await api.get('/movements', { params });
    return response.data;
  },

  async createMovement(movementData) {
    const response = await api.post('/movements', movementData);
    return response.data;
  }
};