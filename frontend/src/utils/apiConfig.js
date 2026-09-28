/**
 * Configuración Centralizada y Dinámica de URL API para Controlab IA
 * Resuelve automáticamente el IP/Host desde el cual el usuario accede a la aplicación
 * evitando bloqueos de 'localhost' desde otros equipos de la red local.
 */
export const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Si se accede en navegador, tomar dinámicamente el hostname (IP local, dominio o localhost)
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:5000/api`;
  }

  return 'http://localhost:5000/api';
};

export const getApiServerOrigin = () => {
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:5000`;
  }
  return 'http://localhost:5000';
};
