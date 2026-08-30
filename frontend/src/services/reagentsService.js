import api from './api';

export const reagentsService = {
  async getAllReagents() {
    try {
      console.log('🧪 Solicitando reactivos...');
      const response = await api.get('/reagents');
      console.log('✅ Reactivos recibidos');
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo reactivos:', error);
      throw error;
    }
  }
};