const Expense = require('../models/Expense');

// POST /api/expenses
// Add a new expense
exports.addExpense = async (req, res) => {
  try {
    const { title, amount, category, description, expenseDate } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Title and amount are required' });
    }

    const expense = await Expense.create({
      hostelOwner: req.user._id,
      title,
      amount: Number(amount),
      category: category || 'Utility',
      description: description || '',
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/expenses
// Get all expenses for this month (default) or all time with ?all=true
exports.getExpenses = async (req, res) => {
  try {
    const { all, category, month } = req.query;

    let filter = { hostelOwner: req.user._id };

    // Month filter: default to current month unless ?all=true
    if (!all || all !== 'true') {
      const now = new Date();
      const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const [year, mon] = targetMonth.split('-').map(Number);
      const startDate = new Date(year, mon - 1, 1);
      const endDate = new Date(year, mon, 1);
      filter.expenseDate = { $gte: startDate, $lt: endDate };
    }

    if (category) {
      filter.category = category;
    }

    const expenses = await Expense.find(filter).sort({ expenseDate: -1 });

    // Compute totals by category
    const totals = { Utility: 0, Maintenance: 0, Supplies: 0, Other: 0 };
    let totalAmount = 0;

    expenses.forEach(exp => {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
      totalAmount += exp.amount;
    });

    // Build proportional bar segments (0-1 ratios)
    const segments = Object.entries(totals).map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      ratio: totalAmount > 0 ? amt / totalAmount : 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        expenses: expenses.map(exp => ({
          id: exp._id,
          title: exp.title,
          amount: exp.amount,
          category: exp.category,
          description: exp.description,
          expenseDate: exp.expenseDate,
          date: new Date(exp.expenseDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
        })),
        summary: {
          totalAmount,
          segments,
          totals,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/expenses/:id
// Get single expense
exports.getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, hostelOwner: req.user._id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, hostelOwner: req.user._id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    await expense.deleteOne();
    res.status(200).json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
