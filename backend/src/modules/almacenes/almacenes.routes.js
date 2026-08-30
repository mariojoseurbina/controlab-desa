const express = require('express');
const router = express.Router();
const almacenesController = require('./almacenes.controller');

router.get('/', almacenesController.listarAlmacenes);
router.get('/:id', almacenesController.obtenerAlmacen);
router.post('/', almacenesController.crearAlmacen);

module.exports = router;
