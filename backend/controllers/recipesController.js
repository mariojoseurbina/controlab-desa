const { executeQuery } = require('../config/database');

const getAllRecipes = async (req, res) => {
  try {
    const recipes = await executeQuery(`
      SELECT r.*, u.nombre_completo as creador_nombre
      FROM recetas r
      LEFT JOIN usuarios u ON r.creado_por = u.id
    `);
    res.json(recipes);
  } catch (error) {
    console.error('Error obteniendo recetas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createRecipe = async (req, res) => {
  try {
    const { nombre, descripcion, procedimiento } = req.body;

    await executeQuery(`
      INSERT INTO recetas (nombre, descripcion, procedimiento, creado_por, fecha_creacion, fecha_actualizacion)
      VALUES (@nombre, @descripcion, @procedimiento, @creado_por, GETDATE(), GETDATE())
    `, {
      nombre, descripcion, procedimiento, creado_por: req.user.id
    });

    res.status(201).json({ message: 'Receta creada exitosamente' });
  } catch (error) {
    console.error('Error creando receta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAllRecipes,
  createRecipe
};