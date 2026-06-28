const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  hostelOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  parentName: {
    type: String,
  },
  parentPhone: {
    type: String,
  },
  aadhar: {
    type: String,
  },
  joiningDate: {
    type: String, // Or Date
  },
  room: {
    type: String, // Storing Room Number for now based on UI
  },
  bed: {
    type: String,
  },
  securityDeposit: {
    type: Number,
  },
  monthlyRent: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Member', memberSchema);
