const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Please add a room number'],
    },
    floor: {
      type: String,
      required: [true, 'Please add a floor'],
    },
    pricePerMonth: {
      type: Number,
      required: [true, 'Please add a price per month'],
    },
    roomType: {
      type: String,
      required: [true, 'Please specify room type'],
    },
    roomCapacity: {
      type: Number,
      min: [1, 'Room capacity must be at least 1'],
      required: [true, 'Please specify room capacity'],
    },
    occupants: {
      type: Number,
      default: 0,
    },
    hostelOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate room numbers for the same hostel owner
roomSchema.index({ roomNumber: 1, hostelOwner: 1 }, { unique: true });

module.exports = mongoose.model('Room', roomSchema);
