const inventoryService = require('./inventory.service');

class InventoryController {
  async getInventory(req, res) {
    try {
      const { almacenId } = req.query;
      console.log('📦 Obteniendo inventario (Screaming Architecture)... Almacén ID:', almacenId);
      const items = await inventoryService.getAllItems(almacenId);
      console.log('✅ Inventario obtenido:', items.length, 'items');
      res.json({ items });
    } catch (error) {
      console.error('❌ Error inventario:', error.message);
      res.status(500).json({ error: error.message, items: [] });
    }
  }

  async createItem(req, res) {
    try {
      console.log('➕ Creando nuevo item:', req.body.nombre);
      await inventoryService.createItem(req.body);
      console.log('✅ Item creado exitosamente');
      res.json({ message: 'Item creado exitosamente' });
    } catch (error) {
      console.error('❌ Error creando item:', error.message);
      res.status(500).json({ error: 'Error creando item: ' + error.message });
    }
  }

  async updateItem(req, res) {
    try {
      const { id } = req.params;
      console.log('✏️ Editando item ID:', id, 'Nombre:', req.body.nombre);
      await inventoryService.updateItem(id, req.body);
      console.log('✅ Item editado exitosamente');
      res.json({ message: 'Item actualizado exitosamente' });
    } catch (error) {
      console.error('❌ Error editando item:', error.message);
      res.status(500).json({ error: 'Error editando item: ' + error.message });
    }
  }

  async deleteItem(req, res) {
    try {
      const { id } = req.params;
      console.log('🗑️ Eliminando item ID:', id);
      await inventoryService.deleteItem(id);
      console.log('✅ Item eliminado exitosamente');
      res.json({ message: 'Item eliminado exitosamente' });
    } catch (error) {
      console.error('❌ Error eliminando item:', error.message);
      res.status(500).json({ error: 'Error al eliminar item: ' + error.message });
    }
  }
}

module.exports = new InventoryController();
