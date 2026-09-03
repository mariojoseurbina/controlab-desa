const almacenesService = require('./almacenes.service');
const { executeQuery } = require('../../../config/database');

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
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async obtenerStockSummary(req, res) {
    try {
      const query = `
        SELECT 
          i.id as item_id,
          i.codigo as item_codigo,
          i.nombre as item_nombre,
          i.referencia as item_referencia,
          i.categoria as item_categoria,
          i.marca as item_marca,
          i.equipo_asociado as item_equipo,
          ISNULL(i.pruebas_teoricas_caja, ISNULL(i.rendimiento_teorico, 500)) as rendimiento_teorico,
          i.stock_actual as stock_total_global,
          ISNULL(sc.stock_actual, 0) as stock_central,
          ISNULL(sl.stock_actual, 0) as stock_laboratorio
        FROM items_inventario i
        LEFT JOIN stock_por_almacen sc ON (i.id = sc.item_id AND sc.almacen_id = 1)
        LEFT JOIN stock_por_almacen sl ON (i.id = sl.item_id AND sl.almacen_id = 2)
        WHERE i.activo = 1
        ORDER BY i.nombre ASC
      `;
      const rows = await executeQuery(query);
      
      let totalStockCentral = 0;
      let totalStockLaboratorio = 0;
      let totalStockGlobal = 0;

      const formatted = rows.map(r => {
        const sc = Number(r.stock_central) || 0;
        const sl = Number(r.stock_laboratorio) || 0;
        const st = Number(r.stock_total_global) || (sc + sl);
        
        totalStockCentral += sc;
        totalStockLaboratorio += sl;
        totalStockGlobal += st;

        return {
          ...r,
          rendimiento_teorico: Number(r.rendimiento_teorico) || 500,
          stock_central: sc,
          stock_laboratorio: sl,
          stock_total_global: st
        };
      });

      res.json({
        success: true,
        totalItems: rows.length,
        totalStockCentral,
        totalStockLaboratorio,
        totalStockGlobal,
        data: formatted
      });
    } catch (err) {
      console.error('Error fetching warehouse stock summary:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new AlmacenesController();
