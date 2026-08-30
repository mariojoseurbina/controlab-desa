import api from './api';

export const recipesService = {
  async getAllRecipes() {
    try {
      console.log('📋 Solicitando recetas...');
      const response = await api.get('/recipes');
      console.log('✅ Recetas recibidas');
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo recetas:', error);
      throw error;
    }
  }
};