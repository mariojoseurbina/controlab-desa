// backend/routes/users.js
const express = require('express');
const router = express.Router();
const { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser 
} = require('../controllers/userController');
const { authMiddleware, checkRole } = require('../middleware/auth');

router.use(authMiddleware);

// Todos los usuarios autenticados pueden ver la lista de usuarios (ej: para asignar bioanalista)
router.get('/', getAllUsers);

// Solo administradores pueden crear, modificar o eliminar usuarios
router.use(checkRole('administrador'));
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;