const almacenesService = require('./almacenes.service');

class AlmacenesController {
  async listarAlmacenes(req, res, next) {
    try {
      const result = await almacenesService.listarAlmacenes();
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async obtenerAlmacen(req, res, next) {
    try {
      const { id } = req.params;
      const result = await almacenesService.obtenerAlmacenPorId(id);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  async crearAlmacen(req, res, next) {
    try {
      const result = await almacenesService.crearAlmacen(req.body);
      res.status(211).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = new AlmacenesController();
