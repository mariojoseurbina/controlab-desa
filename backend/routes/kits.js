const express = require('express');
const router = express.Router();
const kitController = require('../controllers/kitController');

router.post('/reactivos', kitController.agregarReactivoAKit);
router.get('/:kit_id/reactivos', kitController.getReactivosDeKit);
router.delete('/reactivos/:id', kitController.eliminarReactivoDeKit);
router.get('/disponibles', kitController.getKitsDisponibles);
router.get('/lotes/disponibles', kitController.getLotesDisponibles);

module.exports = router;