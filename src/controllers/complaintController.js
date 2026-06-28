const Complaint = require('../models/Complaint');
const Member = require('../models/Member');
const mongoose = require('mongoose');

// @desc    Raise a new complaint
// @route   POST /api/complaints
// @access  Private (User/Student only)
exports.createComplaint = async (req, res) => {
  try {
    const { title, category, description, image } = req.body;

    if (!title || !category || !description) {
      return res.status(400).json({ success: false, message: 'Please provide title, category, and description' });
    }

    // Find the member record associated with the user's mobile number
    const member = await Member.findOne({ mobile: req.user.phoneNumber });
    if (!member) {
      return res.status(400).json({
        success: false,
        message: 'No active hostel admission found for this mobile number.'
      });
    }

    const complaint = new Complaint({
      user: req.user._id,
      member: member._id,
      hostelOwner: member.hostelOwner,
      title,
      category,
      description,
      image: image || null,
      status: 'In Progress',
      updates: [
        {
          text: 'Complaint registered successfully.',
          date: new Date()
        }
      ]
    });

    await complaint.save();

    res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get logged-in user's complaints
// @route   GET /api/complaints/my
// @access  Private (User/Student only)
exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get merchant's hostel complaints
// @route   GET /api/complaints/merchant
// @access  Private (Merchant only)
exports.getMerchantComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ hostelOwner: req.user._id })
      .populate('member', 'name room bed mobile')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single complaint by ID
// @route   GET /api/complaints/:id
// @access  Private (User & Merchant)
exports.getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint ID' });
    }

    const complaint = await Complaint.findById(id)
      .populate('member', 'name room bed mobile');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Authorization check: Must be the user who raised it OR the hostel owner
    const isOwner = String(complaint.user) === String(req.user._id);
    const isMerchant = String(complaint.hostelOwner) === String(req.user._id);

    if (!isOwner && !isMerchant) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this complaint' });
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update complaint status and add status timeline update
// @route   PUT /api/complaints/:id/status
// @access  Private (Merchant only)
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, updateText } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Please provide status' });
    }

    if (!['In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value. Must be In Progress or Resolved.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint ID' });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Ensure it belongs to this merchant
    if (String(complaint.hostelOwner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this complaint' });
    }

    complaint.status = status;
    
    // Add update to timeline
    const text = updateText || `Complaint status updated to ${status}.`;
    complaint.updates.unshift({
      text,
      date: new Date()
    });

    await complaint.save();

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
