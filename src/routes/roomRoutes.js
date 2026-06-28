const express = require('express');
const router = express.Router();
const { createRoom, getRooms, getRoomById, updateRoom, deleteRoom } = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All room routes are protected and require 'merchant' role
router.use(protect);
router.use(authorize('merchant'));

router.route('/')
  .post(createRoom)
  .get(getRooms);

router.route('/:id')
  .get(getRoomById)
  .put(updateRoom)
  .delete(deleteRoom);

module.exports = router;
