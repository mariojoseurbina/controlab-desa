const almacenesService = require('./almacenes.service');
const { executeQuery } = require('../../../config/db');

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
          i.presentacion as item_presentacion,
          i.unidad_manejo,
          ISNULL(i.pruebas_teoricas_caja, ISNULL(i.rendimiento_teorico, 500)) as rendimiento_teorico,
          i.stock_actual as stock_total_global,
          COALESCE(sc.stock_actual, CASE WHEN sl.stock_actual IS NULL THEN i.stock_actual ELSE 0 END, 0) as stock_central,
          CASE 
            WHEN l_cerradas.total IS NOT NULL THEN l_cerradas.total
            ELSE ISNULL(sl.stock_actual, 0)
          END as stock_laboratorio,
          ISNULL(la.cajas_en_uso, 0) as cajas_en_uso,
          la.lote_en_uso,
          la.ml_restantes_en_uso,
          la.pruebas_restantes_en_uso,
          la.usuario_apertura_en_uso
        FROM items_inventario i
        LEFT JOIN stock_por_almacen sc ON (i.id = sc.item_id AND sc.almacen_id = 1)
        LEFT JOIN stock_por_almacen sl ON (i.id = sl.item_id AND sl.almacen_id = 2)
        LEFT JOIN (
          SELECT 
            InventarioId, 
            COUNT(*) as total
          FROM LotesReactivos
          WHERE FechaApertura IS NULL 
            AND Estado IN ('Cerrado', 'CERRADO')
            AND (estado_transferencia IN ('RECIBIDO_LABORATORIO', 'LABORATORIO') OR almacen_destino_id = 2)
            AND CantidadActual > 0
          GROUP BY InventarioId
        ) l_cerradas ON (i.id = l_cerradas.InventarioId)
        LEFT JOIN (
          SELECT 
            InventarioId,
            COUNT(*) as cajas_en_uso,
            MAX(NumeroLote) as lote_en_uso,
            SUM(CantidadActual) as ml_restantes_en_uso,
            SUM(ISNULL(PruebasRestantes, 0)) as pruebas_restantes_en_uso,
            MAX(UsuarioApertura) as usuario_apertura_en_uso
          FROM LotesReactivos
          WHERE Estado = 'Activo'
          GROUP BY InventarioId
        ) la ON (i.id = la.InventarioId)
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
        const st = sc + sl;
        
        totalStockCentral += sc;
        totalStockLaboratorio += sl;
        totalStockGlobal += st;

        return {
          ...r,
          rendimiento_teorico: Number(r.rendimiento_teorico) || 500,
          stock_central: sc,
          stock_laboratorio: sl,
          stock_total_global: st,
          cajas_en_uso: Number(r.cajas_en_uso) || 0,
          ml_restantes_en_uso: r.ml_restantes_en_uso !== null && r.ml_restantes_en_uso !== undefined ? Number(r.ml_restantes_en_uso) : 0,
          pruebas_restantes_en_uso: Number(r.pruebas_restantes_en_uso) || 0,
          lote_en_uso: r.lote_en_uso || null,
          usuario_apertura_en_uso: r.usuario_apertura_en_uso || null
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

