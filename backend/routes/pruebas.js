const express = require('express');
const router = express.Router();
const { uploadExcel } = require('../config/multer');
const pruebasController = require('../controllers/pruebasController');

// POST - Importación masiva de pruebas (usa el config global de multer)
router.post('/importar-masivo', uploadExcel.single('archivo'), pruebasController.importarMasivo);

// POST - Procesar prueba individual (para pruebas manuales)
router.post('/procesar-prueba', pruebasController.procesarPruebaIndividual);

// GET - Obtener capacidad de un kit específico
router.get('/capacidad/:codigo_kit', pruebasController.obtenerCapacidad);

// GET - Obtener historial de pruebas realizadas
router.get('/historial', pruebasController.obtenerHistorial);

module.exports = router;