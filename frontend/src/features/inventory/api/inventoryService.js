import api from '../../../services/api';

export const inventoryService = {
  getAllItems: async () => {
    const response = await api.get('/inventory');
    return response.data;
  },

  getItemById: async (id) => {
    const response = await api.get(`/inventory/${id}`);
    return response.data;
  },

  createItem: async (itemData) => {
    const response = await api.post('/inventory', itemData);
    return response.data;
  },

  updateItem: async (id, itemData) => {
    const response = await api.put(`/inventory/${id}`, itemData);
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await api.delete(`/inventory/${id}`);
    return response.data;
  }
};