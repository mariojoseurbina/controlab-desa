const { executeQuery } = require('../config/database');

const getAllReagents = async (req, res) => {
  try {
    const reagents = await executeQuery(`
      SELECT r.*, i.nombre, i.codigo, i.stock_actual
      FROM reactivos r
      INNER JOIN items_inventario i ON r.item_id = i.id
      WHERE i.activo = 1
    `);
    res.json(reagents);
  } catch (error) {
    console.error('Error obteniendo reactivos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createReagent = async (req, res) => {
  try {
    const {
      item_id, numero_cas, formula_molecular, peso_molecular,
      pureza, condiciones_almacenamiento, nivel_riesgo, url_msds
    } = req.body;

    await executeQuery(`
      INSERT INTO reactivos (
        item_id, numero_cas, formula_molecular, peso_molecular,
        pureza, condiciones_almacenamiento, nivel_riesgo, url_msds
      ) VALUES (
        @item_id, @numero_cas, @formula_molecular, @peso_molecular,
        @pureza, @condiciones_almacenamiento, @nivel_riesgo, @url_msds
      )
    `, {
      item_id, numero_cas, formula_molecular, peso_molecular,
      pureza, condiciones_almacenamiento, nivel_riesgo, url_msds
    });

    res.status(201).json({ message: 'Reactivo creado exitosamente' });
  } catch (error) {
    console.error('Error creando reactivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAllReagents,
  createReagent
};