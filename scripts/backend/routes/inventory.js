const express = require('express');
const { getAllItems, createItem } = require('../controllers/inventoryController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, getAllItems);
router.post('/', auth, createItem);

module.exports = router;