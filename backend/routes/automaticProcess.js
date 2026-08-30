const express = require('express');
const router = express.Router();
const automaticProcessController = require('../controllers/automaticProcessController');

router.post('/ejecutar', automaticProcessController.ejecutarProceso);
router.get('/vinculaciones', automaticProcessController.getVinculaciones);
router.post('/vinculaciones', automaticProcessController.saveVinculacion);
router.get('/logs', automaticProcessController.getLogs);

module.exports = router;