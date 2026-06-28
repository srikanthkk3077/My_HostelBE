const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


exports.register = async (req, res) => {
  try {
    const { name, email, phone: phoneNumber, password, accountType: role, hostelName, hostelAddress, addressProof } = req.body;

    // Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const userData = {
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      role: role || 'User',
    };

    if (userData.role === 'merchant') {
      if (!hostelName || !hostelAddress) {
        return res.status(400).json({
          success: false,
          message: 'Hostel Name and Address are required for owners',
        });
      }
      userData.hostelName = hostelName;
      userData.hostelAddress = hostelAddress;
      userData.addressProof = addressProof || null;
    }

    // Create user
    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/phone number and password' });
    }

    // Check User by email or phone number
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { phoneNumber: email.trim() }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or phone number',
      });
    }

    // Check Password
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
      });
    }

    // Create Token
    const token = jwt.sign(
      { userId: user._id },
      'my_secret_key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    let memberData = null;
    
    if (user.role === 'User') {
      const Member = require('../models/Member');
      memberData = await Member.findOne({ mobile: user.phoneNumber }).lean();
    }

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        memberInfo: memberData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const oldPhone = user.phoneNumber;

    // Check if new email is already taken by another user
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email is already in use' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      // Check if new phone is already taken by another user
      const phoneExists = await User.findOne({ phoneNumber });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: 'Phone number is already in use' });
      }
      user.phoneNumber = phoneNumber;
    }

    await user.save();

    // If student (role: 'User'), sync changes to the Member collection
    if (user.role === 'User') {
      const Member = require('../models/Member');
      const member = await Member.findOne({ mobile: oldPhone });
      if (member) {
        if (name) member.name = name;
        if (phoneNumber) member.mobile = phoneNumber;
        await member.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new passwords' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Request forgot password OTP reset code
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide email or phone number' });
    }

    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { phoneNumber: email.trim() }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No user registered with this email or phone number' });
    }

    // Generate random 6 digit numeric code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetPasswordToken = otp;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    res.status(200).json({
      success: true,
      message: `OTP sent successfully. (For development, use OTP: ${otp})`,
      otp
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password using OTP code
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide email/phone, OTP, and new password' });
    }

    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { phoneNumber: email.trim() }
      ],
      resetPasswordToken: otp,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
    }

    // Hash and update the password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};