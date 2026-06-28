const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
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
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Normal', 'Important', 'Urgent'],
    default: 'Normal',
  },
  author: {
    type: String,
    default: 'Admin',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Notice', noticeSchema);
