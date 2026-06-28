const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  hostelOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['Monthly Fee', 'Security Deposit', 'Fine', 'Other'],
    default: 'Monthly Fee',
  },
  status: {
    type: String,
    enum: ['Paid', 'Failed', 'Pending'],
    default: 'Paid',
  },
  paymentMonth: {
    type: String, // e.g. "2026-06"
    required: true,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'Cash', 'Bank', 'Other'],
    default: 'UPI',
  },
  remarks: {
    type: String,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Fee', feeSchema);
