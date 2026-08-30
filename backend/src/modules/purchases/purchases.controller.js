const purchasesService = require('./purchases.service');

class PurchasesController {
  async getAll(req, res) {
    try {
      console.log('🛒 Obteniendo compras...');
      const compras = await purchasesService.getAll();
      res.json({ success: true, compras });
    } catch (error) {
      console.error('❌ Error obteniendo compras:', error.message);
      res.status(500).json({ error: error.message, compras: [] });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      console.log('🛒 Obteniendo compra ID:', id);
      const compra = await purchasesService.getById(id);
      if (!compra) {
        return res.status(404).json({ error: 'Compra no encontrada' });
      }
      res.json({ success: true, compra });
    } catch (error) {
      console.error('❌ Error obteniendo compra por ID:', error.message);
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      console.log('➕ Creando nueva compra:', req.body.numero_factura);
      const compra = await purchasesService.create(req.body);
      res.status(201).json({ success: true, message: 'Compra creada exitosamente', compra });
    } catch (error) {
      console.error('❌ Error creando compra:', error.message);
      res.status(500).json({ error: 'Error creando compra: ' + error.message });
    }
  }

  async createMultiple(req, res) {
    try {
      console.log('➕ Creando compra múltiple:', req.body.numero_factura);
      const compras = await purchasesService.createMultiple(req.body);
      res.status(201).json({ success: true, message: 'Compra múltiple registrada exitosamente', compras });
    } catch (error) {
      console.error('❌ Error creando compra múltiple:', error.message);
      res.status(500).json({ error: 'Error creando compra múltiple: ' + error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      console.log('✏️ Actualizando compra ID:', id);
      const compra = await purchasesService.update(id, req.body);
      res.json({ success: true, message: 'Compra actualizada exitosamente', compra });
    } catch (error) {
      console.error('❌ Error actualizando compra:', error.message);
      res.status(500).json({ error: 'Error actualizando compra: ' + error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      console.log('🗑️ Eliminando compra ID:', id);
      await purchasesService.delete(id);
      res.json({ success: true, message: 'Compra eliminada exitosamente' });
    } catch (error) {
      console.error('❌ Error eliminando compra:', error.message);
      res.status(500).json({ error: 'Error eliminando compra: ' + error.message });
    }
  }

  async getProveedores(req, res) {
    try {
      console.log('🚚 Obteniendo proveedores...');
      const proveedores = await purchasesService.getProveedores();
      res.json({ success: true, proveedores });
    } catch (error) {
      console.error('❌ Error obteniendo proveedores:', error.message);
      res.status(500).json({ error: error.message, proveedores: [] });
    }
  }

  async createProveedor(req, res) {
    try {
      console.log('➕ Creando proveedor:', req.body.nombre);
      const proveedor = await purchasesService.createProveedor(req.body);
      res.status(201).json({ success: true, message: 'Proveedor creado exitosamente', proveedor });
    } catch (error) {
      console.error('❌ Error creando proveedor:', error.message);
      res.status(500).json({ error: 'Error creando proveedor: ' + error.message });
    }
  }

  async recibirParcial(req, res) {
    try {
      const { id } = req.params;
      const { cantidadRecibida } = req.body;
      console.log(`🚛 Recibiendo compra parcial ID: ${id}, Cantidad recibida: ${cantidadRecibida}`);
      const resultado = await purchasesService.recibirParcial(id, cantidadRecibida);
      res.json({ success: true, message: 'Entrega parcial registrada exitosamente', data: resultado });
    } catch (error) {
      console.error('❌ Error registrando entrega parcial:', error.message);
      res.status(500).json({ error: 'Error registrando entrega parcial: ' + error.message });
    }
  }

  async registrarDevolucion(req, res) {
    try {
      const { id } = req.params;
      const { cantidadDevolver, observaciones } = req.body;
      console.log(`↩️ Registrando devolución compra ID: ${id}, Cantidad a devolver: ${cantidadDevolver}`);
      const resultado = await purchasesService.registrarDevolucion(id, cantidadDevolver, observaciones);
      res.json({ success: true, message: 'Devolución registrada exitosamente', data: resultado });
    } catch (error) {
      console.error('❌ Error registrando devolución:', error.message);
      res.status(500).json({ error: 'Error registrando devolución: ' + error.message });
    }
  }
}

module.exports = new PurchasesController();
