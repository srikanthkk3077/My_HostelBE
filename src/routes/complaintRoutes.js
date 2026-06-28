const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', authorize('User'), complaintController.createComplaint);
router.get('/my', authorize('User'), complaintController.getMyComplaints);
router.get('/merchant', authorize('merchant'), complaintController.getMerchantComplaints);
router.get('/:id', complaintController.getComplaintById);
router.put('/:id/status', authorize('merchant'), complaintController.updateComplaintStatus);

module.exports = router;
