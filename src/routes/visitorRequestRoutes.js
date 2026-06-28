const express = require('express');
const router = express.Router();
const visitorRequestController = require('../controllers/visitorRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', authorize('User'), visitorRequestController.createRequest);
router.get('/my', authorize('User'), visitorRequestController.getMyRequests);
router.get('/merchant', authorize('merchant'), visitorRequestController.getMerchantRequests);
router.put('/:id/status', authorize('merchant'), visitorRequestController.updateRequestStatus);

module.exports = router;
