const express = require('express');
const router = express.Router();
const cajasController = require('./cajas.controller');
const { optionalAuth } = require('../../../middleware/authMiddleware');

router.use(optionalAuth);

router.get('/laboratorio', cajasController.getCajasLaboratorio);
router.get('/en-transito', cajasController.getCajasLaboratorio); // fallback
router.get('/transito', cajasController.getCajasEnTransito);
router.post('/despachar', cajasController.despacharCaja);
router.post('/confirmar-recepcion', cajasController.confirmarRecepcion);
router.post('/rechazar-devolucion', cajasController.rechazarDevolucion);
router.post('/abrir', cajasController.abrirCaja);
router.post('/siguiente-frasco', cajasController.abrirSiguienteFrasco);
router.post('/finalizar-activar-siguiente', cajasController.finalizarCajaYActivarSiguiente);
router.post('/validar-transicion', cajasController.simularValidacionTresPruebas);
router.post('/escanear', cajasController.procesarEscaneo);

module.exports = router;
