const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', noticeController.getNotices);
router.post('/', authorize('merchant'), noticeController.createNotice);

module.exports = router;
