const mongoose = require('mongoose');

const messMenuSchema = new mongoose.Schema({
  hostelOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  day: {
    type: String,
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    required: true,
  },
  breakfast: {
    type: String,
    default: '',
  },
  lunch: {
    type: String,
    default: '',
  },
  snacks: {
    type: String,
    default: '',
  },
  dinner: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

// A hostel owner should only have one menu entry per day of the week
messMenuSchema.index({ hostelOwner: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('MessMenu', messMenuSchema);
