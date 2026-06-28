const VisitorRequest = require('../models/VisitorRequest');
const Member = require('../models/Member');
const mongoose = require('mongoose');

// @desc    Apply for a visitor request
// @route   POST /api/visitor-requests
// @access  Private (User/Student only)
exports.createRequest = async (req, res) => {
  try {
    const { visitorName, visitorPhone, relation, visitDate, visitTime, purpose } = req.body;

    if (!visitorName || !visitorPhone || !relation || !visitDate || !visitTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide visitor name, phone, relation, date, and time of visit.' 
      });
    }

    // Find the member record associated with the user's mobile number
    const member = await Member.findOne({ mobile: req.user.phoneNumber });
    if (!member) {
      return res.status(400).json({
        success: false,
        message: 'No active hostel admission found for this mobile number.'
      });
    }

    const visitorRequest = new VisitorRequest({
      user: req.user._id,
      member: member._id,
      hostelOwner: member.hostelOwner,
      visitorName,
      visitorPhone,
      relation,
      visitDate: new Date(visitDate),
      visitTime,
      purpose: purpose || '',
      status: 'Pending'
    });

    await visitorRequest.save();

    res.status(201).json({ success: true, data: visitorRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get logged-in student's visitor requests
// @route   GET /api/visitor-requests/my
// @access  Private (User/Student only)
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await VisitorRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get merchant's hostel visitor requests
// @route   GET /api/visitor-requests/merchant
// @access  Private (Merchant only)
exports.getMerchantRequests = async (req, res) => {
  try {
    const requests = await VisitorRequest.find({ hostelOwner: req.user._id })
      .populate('member', 'name room bed mobile')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve or Reject a visitor request
// @route   PUT /api/visitor-requests/:id/status
// @access  Private (Merchant only)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Please provide status' });
    }

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be Approved or Rejected' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }

    const visitorRequest = await VisitorRequest.findById(id);
    if (!visitorRequest) {
      return res.status(404).json({ success: false, message: 'Visitor request not found' });
    }

    // Ensure it belongs to this merchant's hostel
    if (String(visitorRequest.hostelOwner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this request' });
    }

    visitorRequest.status = status;
    visitorRequest.remarks = remarks || '';
    visitorRequest.approvedBy = req.user._id;

    await visitorRequest.save();

    res.status(200).json({ success: true, data: visitorRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Scan a visitor pass QR code (merchant looks up by pass ID)
// @route   GET /api/visitor-requests/scan/:id
// @access  Private (Merchant only)
exports.scanPass = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid pass ID in QR code' });
    }

    const visitorRequest = await VisitorRequest.findById(id)
      .populate('member', 'name room bed mobile');

    if (!visitorRequest) {
      return res.status(404).json({ success: false, message: 'Visitor pass not found' });
    }

    // Ensure this pass belongs to the scanning merchant's hostel
    if (String(visitorRequest.hostelOwner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'This pass does not belong to your hostel' });
    }

    res.status(200).json({ success: true, data: visitorRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
