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
  // Mid-month join: owner sets a prorated amount for the first partial month
  isMidJoin: {
    type: Boolean,
    default: false,
  },
  midJoinAmount: {
    type: Number,
    default: 0,
  },
    photoUri: {
    type: String,
    default: null,
  },
  aadharDoc: {
    type: String,
    default: null,
  },
  rentalDoc: {
    type: String,
    default: null,
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


