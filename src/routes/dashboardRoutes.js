const express = require('express');
const router = express.Router();
const { getDashboard, getUserDashboard } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all dashboard routes
router.use(protect);

// User-specific dashboard (both merchants and normal users have access to /user, but mainly users use it)
router.get('/user', getUserDashboard);

// Merchant-specific dashboard (merchant only)
router.use(authorize('merchant'));
router.get('/', getDashboard);

module.exports = router;

