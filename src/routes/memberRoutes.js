const express = require('express');
const router = express.Router();
const {
  registerMember, getMembers, getMemberById, updateMember, deleteMember,
  transferMember, getUnassignedMembers, assignMember,
} = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protect routes
router.use(protect);
router.use(authorize('merchant'));

router.get('/', getMembers);
router.get('/unassigned', getUnassignedMembers);
router.post('/register', registerMember);
router.route('/:id')
  .get(getMemberById)
  .put(updateMember)
  .delete(deleteMember);
router.put('/:id/transfer', transferMember);
router.put('/:id/assign', assignMember);

module.exports = router;
