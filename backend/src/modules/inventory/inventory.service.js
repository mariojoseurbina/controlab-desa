const inventoryRepository = require('./inventory.repository');

class InventoryService {
  async getAllItems(almacenId) {
    return inventoryRepository.findAllActive(almacenId);
  }

  async createItem(data) {
    // Si viene un ID en la data, se trata de una edición
    if (data.id) {
      return this.updateItem(data.id, data);
    }

    if (data.codigo && String(data.codigo).trim() !== '') {
      const cleanCodigo = String(data.codigo).trim();
      const existing = await inventoryRepository.findByCodigo(cleanCodigo);
      
      if (existing) {
        // Si el producto ya existe en el catálogo, actualizamos sus campos en lugar de fallar
        console.log(`ℹ️ Redirigiendo creación a edición para item ID ${existing.id} (Código: ${cleanCodigo})`);
        return this.updateItem(existing.id, data);
      }
    } else {
      // Auto-generar código si el usuario lo dejó en blanco
      data.codigo = `ITEM-${Date.now().toString().slice(-6)}`;
    }
    return inventoryRepository.create(data);
  }

  async updateItem(id, data) {
    const itemIdNum = parseInt(id, 10);
    if (data.codigo && String(data.codigo).trim() !== '') {
      const cleanCodigo = String(data.codigo).trim();
      const existing = await inventoryRepository.findByCodigo(cleanCodigo);
      if (existing && existing.id !== itemIdNum) {
        throw new Error(`El código '${cleanCodigo}' ya pertenece a otro producto en el inventario (${existing.nombre}).`);
      }
    }
    return inventoryRepository.update(itemIdNum, data);
  }

  async deleteItem(id) {
    return inventoryRepository.delete(parseInt(id, 10));
  }
}

module.exports = new InventoryService();
