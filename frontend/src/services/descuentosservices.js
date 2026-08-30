import api from './api';

export const descuentosService = {
    // Pruebas del día
    getPruebasDia: (fecha) => 
        api.get(`/descuentos/pruebas-dia?fecha=${fecha}`),
    
    // Importar
    importarPruebas: (data) => 
        api.post('/descuentos/importar', data),
    
    // Mapeos
    getMapeos: () => 
        api.get('/descuentos/mapeos'),
    
    saveMapeo: (data) => 
        api.post('/descuentos/mapeos', data),
    
    // Ejecución
    simularDescuento: (data) => 
        api.post('/descuentos/simular', data),
    
    ejecutarDescuento: (data) => 
        api.post('/descuentos/ejecutar', data),
    
    // Historial
    getHistorial: (params) => 
        api.get('/descuentos/historial', { params })
};