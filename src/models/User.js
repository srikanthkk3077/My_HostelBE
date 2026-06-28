const mongoose = require('mongoose');
console.log('User model loaded');
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['User', 'merchant'],
      default: 'User',
    },
    hostelName: {
      type: String,
      required: function() { return this.role === 'merchant'; }
    },
    hostelAddress: {
      type: String,
      required: function() { return this.role === 'merchant'; }
    },
    addressProof: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model(
  'User',
  userSchema
);