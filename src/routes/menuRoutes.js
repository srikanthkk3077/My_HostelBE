const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', menuController.getMessMenu);
router.put('/:day', authorize('merchant'), menuController.updateMessMenu);

module.exports = router;
