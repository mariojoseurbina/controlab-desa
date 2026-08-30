const express = require('express');
const router = express.Router();
const purchasesController = require('./purchases.controller');

router.get('/', purchasesController.getAll);
router.get('/proveedores', purchasesController.getProveedores);
router.post('/proveedores', purchasesController.createProveedor);
router.get('/:id', purchasesController.getById);
router.post('/multiple', purchasesController.createMultiple);
router.post('/', purchasesController.create);
router.post('/:id/recibir-parcial', purchasesController.recibirParcial);
router.post('/:id/devolucion', purchasesController.registrarDevolucion);
router.put('/:id', purchasesController.update);
router.delete('/:id', purchasesController.delete);

module.exports = router;
