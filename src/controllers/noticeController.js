const Notice = require('../models/Notice');
const Member = require('../models/Member');

// @desc    Get all notices for the hostel
// @route   GET /api/notices
// @access  Private (User & Merchant)
exports.getNotices = async (req, res) => {
  try {
    let hostelOwner;

    if (req.user.role === 'merchant') {
      hostelOwner = req.user._id;
    } else {
      const member = await Member.findOne({ mobile: req.user.phoneNumber });
      if (!member) {
        return res.status(400).json({
          success: false,
          message: 'No active hostel admission found for this mobile number.'
        });
      }
      hostelOwner = member.hostelOwner;
    }

    let notices = await Notice.find({ hostelOwner }).sort({ createdAt: -1 });

    // Pre-populate with mockup defaults if database is empty for this hostel
    if (notices.length === 0) {
      const defaultNotices = [
        {
          title: 'Water Supply Maintenance',
          message: 'There will be no water supply on 3rd Floor between 10 AM and 2 PM tomorrow due to overhead tank cleaning.',
          type: 'Urgent',
          author: 'Warden',
        },
        {
          title: 'Monthly Fees Reminder',
          message: 'Please clear your pending hostel fees for the current month before the 10th to avoid late fines.',
          type: 'Important',
          author: 'Admin',
        },
        {
          title: 'Upcoming Festival Celebration',
          message: 'We are organizing a small get-together this weekend in the common area. Snacks will be provided!',
          type: 'Normal',
          author: 'Cultural Committee',
        }
      ];

      notices = await Notice.insertMany(
        defaultNotices.map(n => ({ ...n, hostelOwner }))
      );
      
      // Sort again by descending date
      notices.sort((a, b) => b.createdAt - a.createdAt);
    }

    res.status(200).json({ success: true, data: notices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new notice
// @route   POST /api/notices
// @access  Private (Merchant only)
exports.createNotice = async (req, res) => {
  try {
    const { title, message, type, author } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Please provide both title and message' });
    }

    const notice = new Notice({
      hostelOwner: req.user._id,
      title,
      message,
      type: type || 'Normal',
      author: author || 'Admin'
    });

    await notice.save();

    res.status(201).json({ success: true, data: notice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
