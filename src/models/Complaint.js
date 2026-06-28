const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  }
});

const complaintSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Electrical', 'Plumbing', 'Cleaning', 'Internet', 'Carpentry', 'Other'],
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['In Progress', 'Resolved'],
    default: 'In Progress',
  },
  image: {
    type: String, // Base64 or URL
  },
  updates: {
    type: [updateSchema],
    default: [],
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Complaint', complaintSchema);
