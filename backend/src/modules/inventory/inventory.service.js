const inventoryRepository = require('./inventory.repository');

class InventoryService {
  async getAllItems(almacenId) {
    return inventoryRepository.findAllActive(almacenId);
  }

  async createItem(data) {
    if (data.codigo && data.codigo.trim() !== '') {
      const existing = await inventoryRepository.findByCodigo(data.codigo);
      if (existing) {
        throw new Error(`El código '${data.codigo.trim()}' ya está registrado para el producto '${existing.nombre}' en el inventario.`);
      }
    } else {
      // Auto-generar código si el usuario lo dejó en blanco
      data.codigo = `ITEM-${Date.now().toString().slice(-6)}`;
    }
    return inventoryRepository.create(data);
  }

  async updateItem(id, data) {
    if (data.codigo && data.codigo.trim() !== '') {
      const existing = await inventoryRepository.findByCodigo(data.codigo);
      if (existing && existing.id !== parseInt(id)) {
        throw new Error(`El código '${data.codigo.trim()}' ya pertenece a otro item del inventario.`);
      }
    }
    return inventoryRepository.update(id, data);
  }

  async deleteItem(id) {
    return inventoryRepository.delete(id);
  }
}

module.exports = new InventoryService();
