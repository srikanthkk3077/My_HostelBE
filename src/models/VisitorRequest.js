const mongoose = require('mongoose');

const visitorRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
  },
  hostelOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  visitorName: {
    type: String,
    required: true,
  },
  visitorPhone: {
    type: String,
    required: true,
  },
  relation: {
    type: String,
    required: true,
  },
  visitDate: {
    type: Date,
    required: true,
  },
  visitTime: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  remarks: {
    type: String,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('VisitorRequest', visitorRequestSchema);
