const inventoryService = require('../services/inventoryService');

const getAllItems = async (req, res) => {
  try {
    const items = await inventoryService.getAllItems();
    res.json({ items });
  } catch (error) {
    console.error('Error obteniendo items:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getItemById = async (req, res) => {
  try {
    const item = await inventoryService.getItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    res.json(item);
  } catch (error) {
    console.error('Error obteniendo item:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createItem = async (req, res) => {
  try {
    const result = await inventoryService.createItem(req.body, req.user?.id || 1);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creando item:', error);
    if (error.message === 'El código ya existe') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateItem = async (req, res) => {
  try {
    console.log("=== ACTUALIZANDO ITEM ===");
    console.log("ID:", req.params.id);
    console.log("Payload:", req.body);
    
    const result = await inventoryService.updateItem(req.params.id, req.body, req.user?.id || 1);
    res.json(result);
  } catch (error) {
    console.error('Error actualizando item:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteItem = async (req, res) => {
  try {
    const result = await inventoryService.deleteItem(req.params.id, req.user?.id || 1);
    res.json(result);
  } catch (error) {
    console.error('Error eliminando item:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
};