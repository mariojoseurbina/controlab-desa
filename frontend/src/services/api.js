import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiConfig';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000, // Timeout estricto de 15 segundos para impedir relojes de arena infinitos
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    // Actualizar la URL base dinámicamente en cada petición si la ventana cambia de host
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('⚠️ Petición cancelada por tiempo de espera excedido (Timeout 15s)');
    }
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;