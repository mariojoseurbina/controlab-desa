const costosService = require('./costos.service');

class CostosController {
  async getPruebas(req, res) {
    try {
      console.log('🚚 Obteniendo lista de pruebas maestras...');
      const pruebas = await costosService.getPruebas();
      res.json({ success: true, pruebas });
    } catch (error) {
      console.error('❌ Error obteniendo pruebas maestras:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createPrueba(req, res) {
    try {
      console.log('➕ Creando nueva prueba genérica:', req.body.nombre_prueba);
      const prueba = await costosService.createPrueba(req.body);
      res.status(201).json({ success: true, message: 'Prueba genérica creada exitosamente.', prueba });
    } catch (error) {
      console.error('❌ Error creando prueba genérica:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createVinculo(req, res) {
    try {
      console.log('🔗 Vinculando item a prueba...');
      const vinculo = await costosService.createVinculo(req.body);
      res.status(201).json({ success: true, message: 'Producto vinculado exitosamente.', vinculo });
    } catch (error) {
      console.error('❌ Error vinculando item a prueba:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteVinculo(req, res) {
    try {
      const { id } = req.params;
      console.log('🗑️ Desvinculando item ID:', id);
      await costosService.deleteVinculo(id);
      res.json({ success: true, message: 'Vínculo eliminado exitosamente.' });
    } catch (error) {
      console.error('❌ Error desvinculando item:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAnalisisCostos(req, res) {
    try {
      console.log('📊 Generando análisis consolidado de costos...');
      const analisis = await costosService.getAnalisisCostos();
      res.json({ success: true, analisis });
    } catch (error) {
      console.error('❌ Error en análisis de costos:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getImpactoFiscal(req, res) {
    try {
      console.log('📊 Generando reporte de impacto fiscal por área operativa...');
      const impacto = await costosService.getImpactoFiscal();
      res.json({ success: true, impacto });
    } catch (error) {
      console.error('❌ Error en reporte de impacto fiscal:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getGastosGlobales(req, res) {
    try {
      console.log('📊 Obteniendo gastos globales mensuales...');
      const gastos = await costosService.getGastosGlobales();
      res.json({ success: true, gastos });
    } catch (error) {
      console.error('❌ Error obteniendo gastos globales:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async saveGastosGlobales(req, res) {
    try {
      console.log('💾 Guardando gastos globales mensuales:', req.body);
      const gasto = await costosService.saveGastosGlobales(req.body);
      res.json({ success: true, message: 'Gastos globales guardados exitosamente.', gasto });
    } catch (error) {
      console.error('❌ Error guardando gastos globales:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getCostosEquipos(req, res) {
    try {
      console.log('🔬 Obteniendo costos por equipo...');
      const equipos = await costosService.getCostosEquipos();
      res.json({ success: true, equipos });
    } catch (error) {
      console.error('❌ Error obteniendo costos por equipo:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async saveCostoEquipo(req, res) {
    try {
      console.log('💾 Guardando costo por equipo:', req.body);
      const equipo = await costosService.saveCostoEquipo(req.body);
      res.json({ success: true, message: 'Costo por equipo guardado exitosamente.', equipo });
    } catch (error) {
      console.error('❌ Error guardando costo por equipo:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteCostoEquipo(req, res) {
    try {
      const { id } = req.params;
      console.log('🗑️ Eliminando costo de equipo ID:', id);
      await costosService.deleteCostoEquipo(id);
      res.json({ success: true, message: 'Costo de equipo eliminado exitosamente.' });
    } catch (error) {
      console.error('❌ Error eliminando costo de equipo:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async saveCostoPruebaConfig(req, res) {
    try {
      console.log('💾 Guardando configuración de costo de prueba:', req.body);
      const config = await costosService.saveCostoPruebaConfig(req.body);
      res.json({ success: true, message: 'Configuración de costo de prueba guardada exitosamente.', config });
    } catch (error) {
      console.error('❌ Error guardando configuración de costo:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getCostoPruebaConfig(req, res) {
    try {
      const { pruebaId } = req.params;
      console.log('🔍 Obteniendo configuración de costo para prueba ID:', pruebaId);
      const config = await costosService.getCostoPruebaConfig(pruebaId);
      res.json({ success: true, config });
    } catch (error) {
      console.error('❌ Error obteniendo configuración de costo:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async calcularCostoPrueba(req, res) {
    try {
      const { pruebaId } = req.params;
      const { mes, anio } = req.query;
      console.log(`🧮 Calculando costo para prueba ID: ${pruebaId}, mes: ${mes}, anio: ${anio}...`);
      const calculo = await costosService.calcularCostoPrueba(pruebaId, mes, anio);
      res.json({ success: true, calculo });
    } catch (error) {
      console.error('❌ Error calculando costo de prueba:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new CostosController();
