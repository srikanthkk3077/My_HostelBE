const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/collect', feeController.collectFee);
router.post('/pay', feeController.payFee);
router.get('/history', feeController.getFeeHistory);
router.get('/stats', feeController.getFeeStats);
router.get('/member/:memberId', feeController.getMemberTransactions);
router.get('/my-payments', feeController.getMyPayments);
router.get('/:id', feeController.getFeeById);

module.exports = router;


