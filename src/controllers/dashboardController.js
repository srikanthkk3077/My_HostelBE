const Member = require('../models/Member');
const Room = require('../models/Room');

// @desc    Get dashboard stats for the logged-in merchant
// @route   GET /api/dashboard
// @access  Private (Merchant only)
exports.getDashboard = async (req, res) => {
  try {
    const hostelOwner = req.user._id;

    // ── 1. Fetch all rooms ────────────────────────────────────────────────────
    const rooms = await Room.find({ hostelOwner }).lean();

    const totalCapacity = rooms.reduce((sum, r) => sum + (r.roomCapacity || 0), 0);
    const totalRooms = rooms.length;

    // ── 2. Fetch all active members ───────────────────────────────────────────
    const members = await Member.find({ hostelOwner }).lean();
    const activeMembers = members.filter((m) => m.status === 'Active');

    const totalMembers = activeMembers.length;
    const membersWithRooms = activeMembers.filter((m) => m.room && m.room.trim() !== '');
    const totalOccupied = membersWithRooms.length; // each assigned member occupies 1 bed
    const availableBeds = Math.max(0, totalCapacity - totalOccupied);
    const occupancyRate =
      totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

    // ── 3. Revenue calculations ───────────────────────────────────────────────
    // Fetch Fee model to calculate real pending and collected fees
    const Fee = require('../models/Fee');
    
    // Current month string (e.g. "2026-06")
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Expected Revenue = sum of monthlyRent of all active members
    let expectedRevenue = 0;
    activeMembers.forEach(m => {
      expectedRevenue += (m.monthlyRent || 0);
    });

    // Fetch fees collected for the current month
    const currentMonthFees = await Fee.find({ 
      hostelOwner, 
      paymentMonth: currentMonthStr,
      status: 'Paid',
      type: 'Monthly Fee'
    }).lean();

    // Received = sum of fees collected for the current month
    let thisMonthRevenue = 0;
    currentMonthFees.forEach(f => {
      thisMonthRevenue += f.amount;
    });

    // Total Revenue (all time collected)
    const allFees = await Fee.find({ hostelOwner, status: 'Paid' }).lean();
    let totalRevenue = 0;
    allFees.forEach(f => {
      totalRevenue += f.amount;
    });
    
    // If no fees collected ever, you might want to show expected revenue as a baseline, 
    // but showing 0 is more accurate. However, if totalRevenue is 0, we can fall back 
    // to expectedRevenue just so the UI doesn't look empty for new users.
    if (totalRevenue === 0 && expectedRevenue > 0) {
       totalRevenue = expectedRevenue; // Fallback for UI aesthetics before first payment
    }

    // Pending fees = Sum of monthlyRent of all active members who haven't paid this month
    let pendingFees = 0;
    activeMembers.forEach(m => {
      const paidFee = currentMonthFees.find(f => String(f.member) === String(m._id));
      if (!paidFee) {
        pendingFees += (m.monthlyRent || 0);
      }
    });

    // ── 4. Monthly revenue breakdown (last 6 months) ──────────────────────────
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = monthNames[month];

      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

      const monthMembers = members.filter((m) => {
        const created = new Date(m.createdAt);
        return created >= monthStart && created <= monthEnd;
      });

      const value = monthMembers.reduce((sum, m) => sum + (m.monthlyRent || 0), 0);
      monthlyRevenue.push({ value, label });
    }

    // ── 5. Recent activity (last 5 members registered) ────────────────────────
    const recentMembers = await Member.find({ hostelOwner })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name mobile room bed createdAt status')
      .lean();

    const recentActivity = recentMembers.map((m) => ({
      id: m._id,
      type: 'new_member',
      title: 'New member registered',
      subtitle: m.name,
      detail: m.room ? `Room ${m.room} · ${m.bed || ''}` : 'No room assigned',
      createdAt: m.createdAt,
    }));

    // ── 6. Response ───────────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: {
        merchant: {
          name: req.user.name || 'Admin',
          email: req.user.email,
        },
        stats: {
          totalMembers,
          totalRooms,
          totalCapacity,
          totalOccupied,
          availableBeds,
          occupancyRate,
          totalRevenue,
          thisMonthRevenue,
          pendingFees,
          monthlyRevenue,
        },
        recentActivity,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get dashboard stats for the logged-in user (student)
// @route   GET /api/dashboard/user
// @access  Private
exports.getUserDashboard = async (req, res) => {
  try {
    const user = req.user; // Logged in user (role: 'User')
    const mobile = user.phoneNumber;

    // Find the Member record linking to this phone number
    const member = await Member.findOne({ mobile }).lean();
    if (!member) {
      return res.status(200).json({
        success: true,
        message: 'No active hostel admission found for this mobile number.',
        data: {
          name: user.name,
          email: user.email,
          mobile: user.phoneNumber,
          role: user.role,
          hasAdmission: false
        }
      });
    }

    // Find the Room for this member
    const room = await Room.findOne({ roomNumber: member.room, hostelOwner: member.hostelOwner }).lean();

    // Find Roommates
    const roommates = await Member.find({ 
      room: member.room, 
      hostelOwner: member.hostelOwner,
      _id: { $ne: member._id },
      status: 'Active'
    }).lean();

    // Check if current month fee is paid
    const Fee = require('../models/Fee');
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const paidFee = await Fee.findOne({
      member: member._id,
      paymentMonth: currentMonthStr,
      status: 'Paid',
      type: 'Monthly Fee'
    });

    const isPaid = !!paidFee;
    const dueAmount = isPaid ? 0 : (member.monthlyRent || 0);

    // Calculate due date (mocked to 5th of current month for UX, or relative to joining date)
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 5);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let dueStatus = '';
    if (isPaid) {
      dueStatus = 'Paid';
    } else if (diffDays < 0) {
      dueStatus = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      dueStatus = 'Due today';
    } else {
      dueStatus = `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }

    res.status(200).json({
      success: true,
      data: {
        hasAdmission: true,
        name: member.name,
        email: user.email,
        mobile: member.mobile,
        role: user.role,
        rent: {
          amount: member.monthlyRent || 0,
          dueAmount,
          isPaid,
          period: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
          status: dueStatus,
        },
        accommodation: {
          roomNumber: member.room || '-',
          roomType: room ? room.roomType : 'Standard Room',
          bed: member.bed || '-',
          floor: room ? room.floor : '-',
        },
        roommates: roommates.map(r => ({
          id: r._id,
          name: r.name,
          course: 'B.Tech • 2nd Year', // mock course
        })),
        notices: await (async () => {
          const Notice = require('../models/Notice');
          let noticesList = await Notice.find({ hostelOwner: member.hostelOwner }).sort({ createdAt: -1 });

          // Pre-populate defaults if database is empty for this hostel
          if (noticesList.length === 0) {
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

            const inserted = await Notice.insertMany(
              defaultNotices.map(n => ({ ...n, hostelOwner: member.hostelOwner }))
            );
            noticesList = inserted.sort((a, b) => b.createdAt - a.createdAt);
          }

          const formatNoticeDate = (date) => {
            const d = new Date(date);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            
            if (d.toDateString() === today.toDateString()) {
              return `Today, ${timeStr}`;
            } else if (d.toDateString() === yesterday.toDateString()) {
              return `Yesterday, ${timeStr}`;
            } else {
              return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${timeStr}`;
            }
          };

          return noticesList.slice(0, 5).map(n => ({
            id: n._id,
            title: n.title,
            date: formatNoticeDate(n.createdAt),
            priority: n.type === 'Urgent' ? 'high' : 'normal',
          }));
        })()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
