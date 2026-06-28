const Fee = require('../models/Fee');
const Member = require('../models/Member');
const mongoose = require('mongoose');

// POST /api/fees/collect
exports.collectFee = async (req, res) => {
  try {
    const { memberId, amount, type, paymentMonth, paymentMethod, remarks, paymentDate } = req.body;
    
    if (!memberId || !amount || !paymentMonth) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const fee = new Fee({
      hostelOwner: req.user._id,
      member: memberId,
      amount,
      type: type || 'Monthly Fee',
      status: 'Paid',
      paymentMonth,
      paymentMethod: paymentMethod || 'UPI',
      paymentDate: paymentDate || new Date(),
      remarks
    });

    await fee.save();

    res.status(201).json({ success: true, data: fee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/fees/history
exports.getFeeHistory = async (req, res) => {
  try {
    const fees = await Fee.find({ hostelOwner: req.user._id })
      .populate('member', 'name room bed')
      .sort({ paymentDate: -1 });
    
    res.status(200).json({ success: true, data: fees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/fees/stats
exports.getFeeStats = async (req, res) => {
  try {
    // 1. Get all active members for this hostel owner
    const members = await Member.find({ hostelOwner: req.user._id, status: 'Active' });
    
    // 2. Expected Revenue = sum of monthlyRent of all active members
    let expectedRevenue = 0;
    members.forEach(m => {
      expectedRevenue += (m.monthlyRent || 0);
    });

    // 3. Current month string (e.g. "2026-06")
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 4. Fetch fees for the current month
    const currentMonthFees = await Fee.find({ 
      hostelOwner: req.user._id, 
      paymentMonth: currentMonthStr,
      status: 'Paid',
      type: 'Monthly Fee'
    });

    // 5. Received = sum of fees collected for the current month
    let received = 0;
    currentMonthFees.forEach(f => {
      received += f.amount;
    });

    // 6. Pending
    let pending = 0;
    members.forEach(member => {
      const paidFee = currentMonthFees.find(f => String(f.member) === String(member._id));
      if (!paidFee) {
        pending += (member.monthlyRent || 0);
      }
    });

    // 7. Recent Dues / Status per active member
    const dues = members.map(member => {
      const paidFee = currentMonthFees.find(f => String(f.member) === String(member._id));
      return {
        id: member._id,
        name: member.name,
        type: 'Monthly Fee',
        amount: member.monthlyRent || 0,
        status: paidFee ? 'Paid' : 'Pending',
        transactionId: paidFee ? paidFee._id : null
      };
    });

    res.status(200).json({
      success: true,
      data: {
        expectedRevenue,
        received,
        pending: pending > 0 ? pending : 0,
        recentDues: dues
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/fees/member/:memberId
exports.getMemberTransactions = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Validate memberId format
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ success: false, message: 'Invalid member ID' });
    }

    // Ensure member belongs to this hostel owner
    const member = await Member.findOne({ _id: memberId, hostelOwner: req.user._id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Fetch all transactions for this member, newest first
    const fees = await Fee.find({ member: memberId, hostelOwner: req.user._id })
      .sort({ paymentDate: -1 });

    // Build formatted transaction list
    const transactions = fees.map(fee => {
      const isFine = fee.type === 'Fine';
      const date = new Date(fee.paymentDate);

      // Format reference: METHOD/TYPE/shortId
      let ref = '';
      if (fee.paymentMethod === 'UPI') ref = `UPI/${String(fee._id).slice(-9).toUpperCase()}`;
      else if (fee.paymentMethod === 'Cash') ref = 'CASH';
      else if (fee.paymentMethod === 'Bank') ref = `BANK/TXN${String(fee._id).slice(-7).toUpperCase()}`;
      else if (fee.paymentMethod === 'Other') ref = fee.remarks || 'OTHER';
      if (isFine) ref = `SYS/FINE`;

      return {
        id: fee._id,
        type: isFine ? 'debit' : 'credit',
        category: fee.type,
        amount: fee.amount,
        date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        ref,
        paymentMonth: fee.paymentMonth,
        paymentMethod: fee.paymentMethod,
        remarks: fee.remarks || '',
        status: fee.status,
      };
    });

    // Summary: total paid YTD (credits only), total fines
    const totalPaidYTD = fees
      .filter(f => f.type !== 'Fine' && f.status === 'Paid')
      .reduce((sum, f) => sum + f.amount, 0);

    const totalFines = fees
      .filter(f => f.type === 'Fine')
      .reduce((sum, f) => sum + f.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        member: {
          id: member._id,
          name: member.name,
          room: member.room,
          monthlyRent: member.monthlyRent,
        },
        summary: {
          totalPaidYTD,
          totalFines,
        },
        transactions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/fees/:id
exports.getFeeById = async (req, res) => {
  try {
    let query = { _id: req.params.id };

    if (req.user.role === 'merchant') {
      query.hostelOwner = req.user._id;
    } else {
      const member = await Member.findOne({ mobile: req.user.phoneNumber });
      if (!member) {
        return res.status(404).json({ success: false, message: 'No active hostel admission found' });
      }
      query.member = member._id;
    }

    const fee = await Fee.findOne(query)
      .populate('member', 'name room bed mobile');
      
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    res.status(200).json({ success: true, data: fee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/fees/pay
exports.payFee = async (req, res) => {
  try {
    const user = req.user; // Logged in user (role: 'User')
    const { amount, paymentMethod } = req.body;

    const member = await Member.findOne({ mobile: user.phoneNumber });
    if (!member) {
      return res.status(404).json({ success: false, message: 'No active hostel admission found for this mobile number.' });
    }

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const fee = new Fee({
      hostelOwner: member.hostelOwner,
      member: member._id,
      amount: amount || member.monthlyRent || 0,
      type: 'Monthly Fee',
      status: 'Paid',
      paymentMonth: currentMonthStr,
      paymentMethod: paymentMethod || 'UPI',
      paymentDate: now,
      remarks: 'Self Paid via Student App'
    });

    await fee.save();

    res.status(201).json({ success: true, data: fee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get personal payments history and dues for logged-in user
// @route   GET /api/fees/my-payments
// @access  Private
exports.getMyPayments = async (req, res) => {
  try {
    const user = req.user; // Logged in user
    
    // Find the Member record linking to this phone number
    const member = await Member.findOne({ mobile: user.phoneNumber });
    if (!member) {
      return res.status(200).json({
        success: true,
        message: 'No active hostel admission found for this mobile number.',
        data: {
          hasAdmission: false,
          totalOutstanding: 0,
          dueStatus: 'No Dues',
          transactions: []
        }
      });
    }

    // Fetch all transactions for this member
    const fees = await Fee.find({ member: member._id })
      .sort({ paymentDate: -1 });

    // Check current month fee status
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const paidFee = fees.find(f => f.paymentMonth === currentMonthStr && f.status === 'Paid' && f.type === 'Monthly Fee');
    
    const isPaid = !!paidFee;
    const totalOutstanding = isPaid ? 0 : (member.monthlyRent || 0);

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

    // Format transactions
    const formattedTransactions = [];

    // If unpaid, add the current month's rent as a pending transaction at the top
    if (!isPaid) {
      formattedTransactions.push({
        id: 'pending-current',
        title: `${now.toLocaleString('default', { month: 'long' })} Rent`,
        amount: member.monthlyRent || 0,
        date: `01 ${now.toLocaleString('default', { month: 'short', year: 'numeric' })}`,
        status: 'Awaiting Payment',
        isPending: true
      });
    }

    // Add historical payments
    fees.forEach(fee => {
      const isPaidFee = fee.status === 'Paid';
      const date = new Date(fee.paymentDate);
      const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Parse payment month (e.g. "2026-05" -> "May Rent")
      let title = 'Hostel Fee';
      if (fee.paymentMonth) {
        const parts = fee.paymentMonth.split('-');
        if (parts.length === 2) {
          const mIdx = parseInt(parts[1], 10) - 1;
          const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][mIdx];
          title = `${monthName} Rent`;
        }
      }

      formattedTransactions.push({
        id: fee._id,
        title,
        amount: fee.amount,
        date: `${String(date.getDate()).padStart(2, '0')} ${monthNamesShort[date.getMonth()]} ${date.getFullYear()}`,
        status: isPaidFee ? 'Paid' : fee.status,
        isPending: false,
        paymentMethod: fee.paymentMethod
      });
    });

    res.status(200).json({
      success: true,
      data: {
        hasAdmission: true,
        totalOutstanding,
        dueStatus,
        rentPeriod: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        transactions: formattedTransactions
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
