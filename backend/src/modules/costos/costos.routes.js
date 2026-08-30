const express = require('express');
const router = express.Router();
const costosController = require('./costos.controller');

router.get('/pruebas', costosController.getPruebas);
router.post('/pruebas', costosController.createPrueba);
router.post('/vinculos', costosController.createVinculo);
router.delete('/vinculos/:id', costosController.deleteVinculo);
router.get('/analisis', costosController.getAnalisisCostos);
router.get('/impacto', costosController.getImpactoFiscal);

// Nuevos endpoints de Costos Avanzados
router.get('/gastos-globales', costosController.getGastosGlobales);
router.post('/gastos-globales', costosController.saveGastosGlobales);
router.get('/equipos', costosController.getCostosEquipos);
router.post('/equipos', costosController.saveCostoEquipo);
router.delete('/equipos/:id', costosController.deleteCostoEquipo);
router.get('/config/:pruebaId', costosController.getCostoPruebaConfig);
router.post('/config', costosController.saveCostoPruebaConfig);
router.get('/calcular/:pruebaId', costosController.calcularCostoPrueba);

module.exports = router;
