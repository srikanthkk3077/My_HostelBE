const express = require('express');
const router = express.Router();
const { addExpense, getExpenses, getExpenseById, deleteExpense } = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getExpenses);
router.post('/', addExpense);
router.get('/:id', getExpenseById);
router.delete('/:id', deleteExpense);


module.exports = router;
