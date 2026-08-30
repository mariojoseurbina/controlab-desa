import api from './api';

export const usersService = {
  async getAllUsers() {
    const response = await api.get('/users');
    return response.data;
  },

  async createUser(userData) {
    const response = await api.post('/users', userData);
    return response.data;
  },

  async updateUser(id, userData) {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  }
};