const express = require('express');
const router = express.Router();
const cajasController = require('./cajas.controller');
const { authenticateToken } = require('../../../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/laboratorio', cajasController.getCajasLaboratorio);
router.post('/abrir', cajasController.abrirCaja);
router.post('/siguiente-frasco', cajasController.abrirSiguienteFrasco);
router.post('/finalizar-activar-siguiente', cajasController.finalizarCajaYActivarSiguiente);
router.post('/validar-transicion', cajasController.simularValidacionTresPruebas);
router.post('/escanear', cajasController.procesarEscaneo);

module.exports = router;
