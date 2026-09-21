const cajasService = require('./cajas.service');

class CajasController {
  async getCajasLaboratorio(req, res) {
    try {
      const data = await cajasService.getCajasLaboratorio();
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('[CajasController] Error al obtener cajas:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async abrirCaja(req, res) {
    try {
      const { loteId, usuarioNombre, equipo } = req.body;
      if (!loteId) {
        return res.status(400).json({ success: false, message: 'El ID de la caja/lote es requerido.' });
      }
      const usuario = usuarioNombre || req.user?.nombre_completo || req.user?.usuario || 'Bioanalista';
      const result = await cajasService.abrirCaja({ loteId, usuarioNombre: usuario, equipo });
      res.status(200).json(result);
    } catch (error) {
      console.error('[CajasController] Error al abrir caja:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async abrirSiguienteFrasco(req, res) {
    try {
      const { loteId, usuarioNombre } = req.body;
      if (!loteId) {
        return res.status(400).json({ success: false, message: 'El ID de la caja/lote es requerido.' });
      }
      const usuario = usuarioNombre || req.user?.nombre_completo || req.user?.usuario || 'Bioanalista';
      const result = await cajasService.abrirSiguienteFrasco({ loteId, usuarioNombre: usuario });
      res.status(200).json(result);
    } catch (error) {
      console.error('[CajasController] Error al cambiar frasco:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async procesarEscaneo(req, res) {
    try {
      const { barcode, usuarioNombre, equipo } = req.body;
      if (!barcode) {
        return res.status(400).json({ success: false, message: 'El código de barras es requerido.' });
      }
      const usuario = usuarioNombre || req.user?.nombre_completo || req.user?.usuario || 'Bioanalista';
      const result = await cajasService.procesarEscaneo({ barcode, usuarioNombre: usuario, equipo });
      res.status(200).json(result);
    } catch (error) {
      console.error('[CajasController] Error al procesar escaneo:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async finalizarCajaYActivarSiguiente(req, res) {
    try {
      const { loteId, usuarioNombre } = req.body;
      if (!loteId) {
        return res.status(400).json({ success: false, message: 'El ID de la caja/lote es requerido.' });
      }
      const usuario = usuarioNombre || req.user?.nombre_completo || req.user?.usuario || 'Bioanalista';
      const result = await cajasService.finalizarCajaYActivarSiguiente({ loteId, usuarioNombre: usuario });
      res.status(200).json(result);
    } catch (error) {
      console.error('[CajasController] Error al finalizar y activar caja:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async simularValidacionTresPruebas(req, res) {
    try {
      const { loteId, usuarioNombre } = req.body;
      if (!loteId) {
        return res.status(400).json({ success: false, message: 'El ID de la caja/lote es requerido.' });
      }
      const usuario = usuarioNombre || req.user?.nombre_completo || req.user?.usuario || 'Bioanalista Validador';
      const result = await cajasService.simularValidacionTresPruebas({ loteId, usuarioNombre: usuario });
      res.status(200).json(result);
    } catch (error) {
      console.error('[CajasController] Error en simular validación 3 pruebas:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getCajasEnTransito(req, res) {
    try {
      const data = await cajasService.getCajasEnTransito();
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('[CajasController] Error al obtener cajas en tránsito:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async despacharCaja(req, res) {
    try {
      const { loteId, almacenDestinoId, usuarioNombre } = req.body;
      if (!loteId) {
        return res.status(400).json({ success: false, message: 'El ID de la caja/lote es requerido.' });
      }
      const usuario = usuarioNombre || req.user?.nombre_completo || req.user?.usuario || 'Encargado de Almacén';
      const result = await cajasService.despacharCajaAlmacen({ loteId, almacenDestinoId, usuarioDespacho: usuario });
      res.status(200).json(result);
    } catch (error) {
      console.error('[CajasController] Error al despachar caja:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async confirmarRecepcion(req, res) {
    try {
      const { barcode, loteId, usuarioNombre } = req.body;
      const usuario = usuarioNombre || req.user?.nombre_completo || req.user?.usuario || 'Bioanalista Receptores';
      const result = await cajasService.confirmarRecepcionElectronica({ barcode, loteId, usuarioRecepcion: usuario });
      res.status(200).json(result);
    } catch (error) {
      console.error('[CajasController] Error al confirmar recepción electrónica:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async rechazarDevolucion(req, res) {
    try {
      const { loteId, motivo, usuarioNombre } = req.body;
      if (!loteId) {
        return res.status(400).json({ success: false, message: 'El ID de la caja/lote es requerido.' });
      }
      const usuario = usuarioNombre || req.user?.nombre_completo || req.user?.usuario || 'Bioanalista';
      const result = await cajasService.rechazarDevolverAlmacen({ loteId, motivo, usuarioNombre: usuario });
      res.status(200).json(result);
    } catch (error) {
      console.error('[CajasController] Error al rechazar y devolver caja:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

}

module.exports = new CajasController();
