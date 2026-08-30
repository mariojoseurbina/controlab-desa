const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getAllRecipes,
  createRecipe
} = require('../controllers/recipesController');

const router = express.Router();

router.get('/', authenticateToken, getAllRecipes);
router.post('/', authenticateToken, createRecipe);

module.exports = router;