const MessMenu = require('../models/MessMenu');
const Member = require('../models/Member');

// @desc    Get weekly mess menu for the hostel
// @route   GET /api/mess-menu
// @access  Private (User & Merchant)
exports.getMessMenu = async (req, res) => {
  try {
    let hostelOwner;

    if (req.user.role === 'merchant') {
      hostelOwner = req.user._id;
    } else {
      // For student/User role, resolve hostelOwner via Member collection
      const member = await Member.findOne({ mobile: req.user.phoneNumber });
      if (!member) {
        return res.status(400).json({
          success: false,
          message: 'No active hostel admission found for this mobile number.'
        });
      }
      hostelOwner = member.hostelOwner;
    }

    // Fetch menu schedule
    let menuEntries = await MessMenu.find({ hostelOwner });

    // Pre-populate with premium defaults if database is empty for this owner
    if (menuEntries.length === 0) {
      const defaultMenu = [
        { day: 'Mon', breakfast: 'Idli, Vada, Sambar, Chutney, Tea/Coffee', lunch: 'Roti, Dal Tadka, Paneer Butter Masala, Rice, Salad', snacks: 'Samosa, Green Chutney, Tea', dinner: 'Roti, Mix Veg, Dal Fry, Rice, Gulab Jamun' },
        { day: 'Tue', breakfast: 'Poha, Jalebi, Tea/Coffee', lunch: 'Rajma Chawal, Roti, Curd, Salad', snacks: 'Bread Pakoda, Tea', dinner: 'Roti, Bhindi Masala, Dal, Jeera Rice' },
        { day: 'Wed', breakfast: 'Dosa, Sambar, Coconut Chutney, Tea/Coffee', lunch: 'Veg Biryani, Raita, Roti, Aloo Gobhi', snacks: 'Aloo Tikki, Tea', dinner: 'Roti, Chana Masala, Dal Fry, Rice' },
        { day: 'Thu', breakfast: 'Alu Paratha, Butter, Pickle, Tea/Coffee', lunch: 'Kadhi Pakoda, Rice, Roti, Mix Veg', snacks: 'Kachori, Tea', dinner: 'Roti, Paneer Bhurji, Dal, Rice' },
        { day: 'Fri', breakfast: 'Idli, Upma, Chutney, Tea/Coffee', lunch: 'Dal Makhani, Roti, Rice, Jeera Aloo', snacks: 'Samosa, Tea', dinner: 'Roti, Shahi Paneer, Rice, Dal Fry' },
        { day: 'Sat', breakfast: 'Puri, Aloo Curry, Tea/Coffee', lunch: 'Chole Bhature, Onion, Lemon, Pickle', snacks: 'Biscuits, Tea', dinner: 'Roti, Veg Kofta, Dal Tadka, Rice' },
        { day: 'Sun', breakfast: 'Bread Butter, Omelette/Cutlet, Tea/Coffee', lunch: 'Special Lunch: Paneer Kadhai, Dal Fry, Roti, Pulao, Sweet', snacks: 'Pakora, Tea', dinner: 'Roti, Egg Curry/Veg Korma, Dal, Rice' }
      ];

      menuEntries = await MessMenu.insertMany(
        defaultMenu.map(m => ({ ...m, hostelOwner }))
      );
    }

    res.status(200).json({ success: true, data: menuEntries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update or create mess menu for a specific day
// @route   PUT /api/mess-menu/:day
// @access  Private (Merchant only)
exports.updateMessMenu = async (req, res) => {
  try {
    const { day } = req.params;
    const { breakfast, lunch, snacks, dinner } = req.body;

    if (!['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(day)) {
      return res.status(400).json({ success: false, message: 'Invalid day of the week' });
    }

    let menuEntry = await MessMenu.findOne({ hostelOwner: req.user._id, day });

    if (menuEntry) {
      menuEntry.breakfast = breakfast !== undefined ? breakfast : menuEntry.breakfast;
      menuEntry.lunch = lunch !== undefined ? lunch : menuEntry.lunch;
      menuEntry.snacks = snacks !== undefined ? snacks : menuEntry.snacks;
      menuEntry.dinner = dinner !== undefined ? dinner : menuEntry.dinner;
      await menuEntry.save();
    } else {
      menuEntry = new MessMenu({
        hostelOwner: req.user._id,
        day,
        breakfast: breakfast || '',
        lunch: lunch || '',
        snacks: snacks || '',
        dinner: dinner || ''
      });
      await menuEntry.save();
    }

    res.status(200).json({ success: true, data: menuEntry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
