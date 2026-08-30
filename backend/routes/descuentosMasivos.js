const express = require('express');
const router = express.Router();
const descuentosMasivosController = require('../controllers/descuentosMasivosController');
const { authMiddleware, checkRole } = require('../middleware/auth');

// Todas las rutas requieren autenticación
// router.use(authMiddleware);

// Importar exámenes desde Infolab
router.post('/importar', checkRole(['admin', 'supervisor']), descuentosMasivosController.importarExamenes);

// Obtener exámenes pendientes
router.get('/examenes', descuentosMasivosController.getExamenesPendientes);

// Ejecutar descuentos masivos
router.post('/ejecutar', checkRole(['admin', 'supervisor']), descuentosMasivosController.ejecutarDescuentos);

// Gestión de mapeos
router.get('/mapeos', descuentosMasivosController.getMapeos);
router.post('/mapeos', checkRole(['admin', 'supervisor']), descuentosMasivosController.saveMapeo);
router.put('/mapeos/:id', checkRole(['admin', 'supervisor']), descuentosMasivosController.saveMapeo);
router.delete('/mapeos/:id', checkRole(['admin', 'supervisor']), descuentosMasivosController.deleteMapeo);

// Reportes
router.get('/reporte', descuentosMasivosController.getReporteDescuentos);

// Sugerencias
router.get('/sugerencias', descuentosMasivosController.getSugerenciasMapeo);

module.exports = router;