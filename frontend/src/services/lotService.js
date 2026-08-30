import api from './api';

export const lotService = {
  // Obtener todos los lotes
  async getAllLotes() {
    try {
      const response = await api.get('/lotes');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo lotes:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Obtener lote por ID
  async getLotById(id) {
    try {
      const response = await api.get(`/lotes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo lote:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Crear nuevo lote
  async createLot(lotData) {
    try {
      console.log('🚀 Enviando a: /lotes');
      console.log('📦 Datos:', lotData);
      
      const response = await api.post('/lotes', lotData);
      console.log('📥 Respuesta:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creando lote:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Actualizar lote
  async updateLot(id, lotData) {
    try {
      const response = await api.put(`/lotes/${id}`, lotData);
      return response.data;
    } catch (error) {
      console.error('Error actualizando lote:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Eliminar lote
  async deleteLot(id) {
    try {
      const response = await api.delete(`/lotes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error eliminando lote:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Obtener lotes por reactivo
  async getLotesByReactivo(reactivoId) {
    try {
      const response = await api.get(`/lotes/reactivo/${reactivoId}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo lotes por reactivo:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Simular pruebas
  async simularPruebas(simulacionData) {
    try {
      const response = await api.post('/lotes/simular-pruebas', simulacionData);
      return response.data;
    } catch (error) {
      console.error('Error en simulación:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
};

export default lotService;