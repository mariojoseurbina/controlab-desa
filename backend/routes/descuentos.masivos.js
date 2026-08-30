////    ARCHIVO INGRESADO 11/12/2025 ///////


const express = require('express');
const router = express.Router();
const descuentosController = require('../controllers/descuentosController');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
// router.use(authMiddleware);

// Obtener pruebas del día actual
router.get('/pruebas-dia', descuentosController.getPruebasDia);

// Importar pruebas (ejecuta sp_ImportarEstadisticasDiarias)
router.post('/importar', descuentosController.importarPruebas);

// Gestión de mapeos
router.get('/mapeos', descuentosController.getMapeos);
router.post('/mapeos', descuentosController.saveMapeo);
router.put('/mapeos/:id', descuentosController.updateMapeo);

// Ejecución de descuentos
router.post('/simular', descuentosController.simularDescuento);
router.post('/ejecutar', descuentosController.ejecutarDescuento);

// Historial y reportes
router.get('/historial', descuentosController.getHistorial);
router.get('/reporte/:fecha', descuentosController.getReporte);

module.exports = router;