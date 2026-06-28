const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  hostelOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    enum: ['Utility', 'Maintenance', 'Supplies', 'Other'],
    default: 'Utility',
  },
  description: {
    type: String,
    default: '',
  },
  expenseDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Expense', expenseSchema);
