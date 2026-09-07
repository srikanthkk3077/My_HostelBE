const Member = require('../models/Member');
const Room = require('../models/Room');

// @desc    Register a new member (admission)
// @route   POST /api/members/register
// @access  Private (Merchant only)
exports.registerMember = async (req, res) => {
  try {
    const { 
      name, mobile, parentName, parentPhone, aadhar, 
      joiningDate, room, bed, deposit, monthlyFee,
      isMidJoin, midJoinAmount, securityDeposit: secDep, monthlyRent: mRent,
      photoUri, aadharDoc, rentalDoc,
    } = req.body;

    // Optional: Update the room occupants count if Room exists
    const roomDoc = await Room.findOne({ roomNumber: room, hostelOwner: req.user._id });
    
    // Create new Member
    const member = await Member.create({
      hostelOwner: req.user._id,
      name,
      mobile,
      parentName,
      parentPhone,
      aadhar,
      joiningDate,
      room,
      bed,
      securityDeposit: secDep ? Number(secDep) : (deposit ? Number(deposit) : 0),
      monthlyRent: mRent ? Number(mRent) : (monthlyFee ? Number(monthlyFee) : 0),
      isMidJoin: isMidJoin === true || isMidJoin === 'true',
      midJoinAmount: midJoinAmount ? Number(midJoinAmount) : 0,
      photoUri: photoUri || null,
      aadharDoc: aadharDoc || null,
      rentalDoc: rentalDoc || null,
    });

    if (roomDoc) {
      roomDoc.occupants = (roomDoc.occupants || 0) + 1;
      await roomDoc.save();
    }

    res.status(201).json({
      success: true,
      message: 'Member admitted successfully',
      data: member,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all members
// @route   GET /api/members
// @access  Private (Merchant only)
exports.getMembers = async (req, res) => {
  try {
    const Fee = require('../models/Fee');
    const members = await Member.find({ hostelOwner: req.user._id }).lean();
    
    // Check fees for current month
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthFees = await Fee.find({ 
      hostelOwner: req.user._id, 
      paymentMonth: currentMonthStr,
      status: 'Paid',
      type: 'Monthly Fee'
    }).lean();

    const membersWithFeeStatus = members.map(m => {
      const paidFee = currentMonthFees.find(f => String(f.member) === String(m._id));
      const hasPaid = !!paidFee;
      
      return {
        ...m,
        // If not paid, balance is their monthly rent. If paid, balance is 0.
        computedBalance: hasPaid ? 0 : (m.monthlyRent || 0),
        computedStatus: hasPaid ? 'Active' : 'Pending Fee'
      };
    });
    
    res.status(200).json({
      success: true,
      count: membersWithFeeStatus.length,
      data: membersWithFeeStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single member
// @route   GET /api/members/:id
// @access  Private (Merchant only)
exports.getMemberById = async (req, res) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, hostelOwner: req.user._id }).lean();

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Check fees for current month
    const Fee = require('../models/Fee');
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const paidFee = await Fee.findOne({ 
      hostelOwner: req.user._id, 
      member: member._id,
      paymentMonth: currentMonthStr,
      status: 'Paid',
      type: 'Monthly Fee'
    }).lean();

    const hasPaid = !!paidFee;
    let computedBalance = hasPaid ? 0 : (member.monthlyRent || 0);
    
    // Check mid-join
    if (!hasPaid && member.isMidJoin && member.midJoinAmount > 0 && member.joiningDate) {
      let joinDateObj = null;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(member.joiningDate)) {
        const [d, mo, y] = member.joiningDate.split('/');
        joinDateObj = new Date(Number(y), Number(mo) - 1, Number(d));
      } else {
        joinDateObj = new Date(member.joiningDate);
      }
      if (joinDateObj && !isNaN(joinDateObj.getTime())) {
        const isJoiningMonth = joinDateObj.getFullYear() === now.getFullYear() && joinDateObj.getMonth() === now.getMonth();
        if (isJoiningMonth) {
          computedBalance = member.midJoinAmount;
        }
      }
    }

    const computedStatus = hasPaid ? 'Active' : 'Pending Fee';

    res.status(200).json({
      success: true,
      data: {
        ...member,
        hasPaidCurrentMonth: hasPaid,
        computedBalance,
        computedStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update member
// @route   PUT /api/members/:id
// @access  Private (Merchant only)
exports.updateMember = async (req, res) => {
  try {
    let member = await Member.findOne({ _id: req.params.id, hostelOwner: req.user._id });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    member = await Member.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: member,
      message: 'Member updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete member
// @route   DELETE /api/members/:id
// @access  Private (Merchant only)
exports.deleteMember = async (req, res) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, hostelOwner: req.user._id });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Decrease room occupancy if applicable
    if (member.room) {
      const roomDoc = await Room.findOne({ roomNumber: member.room, hostelOwner: req.user._id });
      if (roomDoc && roomDoc.occupants > 0) {
        roomDoc.occupants -= 1;
        await roomDoc.save();
      }
    }

    await member.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Member deleted successfully',
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Transfer member to a new room
// @route   PUT /api/members/:id/transfer
// @access  Private (Merchant only)
exports.transferMember = async (req, res) => {
  try {
    const { newRoomNumber, newBed } = req.body;
    
    if (!newRoomNumber) {
      return res.status(400).json({ success: false, message: 'New room number is required' });
    }

    const member = await Member.findOne({ _id: req.params.id, hostelOwner: req.user._id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (member.room === newRoomNumber) {
      return res.status(400).json({ success: false, message: 'Member is already in Room ' + newRoomNumber });
    }

    // Load old room and new room
    const oldRoomNumber = member.room;
    const oldRoomDoc = await Room.findOne({ roomNumber: oldRoomNumber, hostelOwner: req.user._id });
    const newRoomDoc = await Room.findOne({ roomNumber: newRoomNumber, hostelOwner: req.user._id });

    if (!newRoomDoc) {
      return res.status(404).json({ success: false, message: 'New room not found in the database' });
    }

    // Check capacity of target room
    const newRoomOccupants = await Member.find({
      room: newRoomNumber,
      hostelOwner: req.user._id,
      _id: { $ne: member._id },
      status: { $ne: 'Inactive' },
    });

    if (newRoomDoc.roomCapacity && newRoomOccupants.length >= newRoomDoc.roomCapacity) {
      return res.status(400).json({
        success: false,
        message: `Room ${newRoomNumber} is already full (${newRoomOccupants.length}/${newRoomDoc.roomCapacity} beds occupied)`,
      });
    }

    // Determine available bed in the new room
    let assignedBed = newBed;
    if (!assignedBed) {
      const takenBeds = newRoomOccupants.map((m) => m.bed);
      const capacity = newRoomDoc.roomCapacity || 4;
      for (let i = 1; i <= capacity; i++) {
        const candidate = `Bed ${i}`;
        if (!takenBeds.includes(candidate)) {
          assignedBed = candidate;
          break;
        }
      }
      if (!assignedBed) {
        assignedBed = `Bed ${newRoomOccupants.length + 1}`;
      }
    }

    // Update old room occupants count
    if (oldRoomDoc) {
      const oldRoomRemaining = await Member.countDocuments({
        room: oldRoomNumber,
        hostelOwner: req.user._id,
        _id: { $ne: member._id },
        status: { $ne: 'Inactive' },
      });
      oldRoomDoc.occupants = oldRoomRemaining;
      await oldRoomDoc.save();
    }

    // Update new room occupants count
    newRoomDoc.occupants = newRoomOccupants.length + 1;
    await newRoomDoc.save();

    // Update Member details
    member.room = newRoomNumber;
    member.bed = assignedBed;
    if (newRoomDoc.pricePerMonth) {
      member.monthlyRent = newRoomDoc.pricePerMonth;
    }
    await member.save();

    res.status(200).json({
      success: true,
      message: `Transferred to Room ${newRoomNumber} (${assignedBed}) successfully`,
      data: member,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all members with no room assigned (unassigned)
// @route   GET /api/members/unassigned
// @access  Private (Merchant only)
exports.getUnassignedMembers = async (req, res) => {
  try {
    // "Unassigned" means the member has no room or empty room field
    const members = await Member.find({
      hostelOwner: req.user._id,
      $or: [{ room: { $exists: false } }, { room: '' }, { room: null }],
    }).select('name mobile joiningDate monthlyRent');

    res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign a member to a room and bed directly from Room screen
// @route   PUT /api/members/:id/assign
// @access  Private (Merchant only)
exports.assignMember = async (req, res) => {
  try {
    const { roomNumber, bed } = req.body;
    console.log(`[assignMember] req.body:`, req.body);
    console.log(`[assignMember] memberId:`, req.params.id);

    if (!roomNumber || !bed) {
      console.log(`[assignMember] missing roomNumber or bed`);
      return res.status(400).json({ success: false, message: 'roomNumber and bed are required' });
    }

    const member = await Member.findOne({ _id: req.params.id, hostelOwner: req.user._id });
    if (!member) {
      console.log(`[assignMember] Member not found`);
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Check the target bed isn't already taken
    const existingOccupant = await Member.findOne({
      hostelOwner: req.user._id,
      room: roomNumber,
      bed,
    });
    if (existingOccupant) {
      console.log(`[assignMember] Bed already occupied by ${existingOccupant.name}`);
      return res.status(400).json({ success: false, message: `Bed ${bed} in Room ${roomNumber} is already occupied` });
    }

    const roomDoc = await Room.findOne({ roomNumber, hostelOwner: req.user._id });
    if (!roomDoc) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Assign the member to the room and bed
    member.room = roomNumber;
    member.bed = bed;
    if (!member.monthlyRent) {
      member.monthlyRent = roomDoc.pricePerMonth;
    }
    await member.save();

    // Increment room occupancy
    roomDoc.occupants = (roomDoc.occupants || 0) + 1;
    await roomDoc.save();

    res.status(200).json({
      success: true,
      message: 'Member assigned successfully',
      data: member,
    });
  } catch (error) {
    console.error('AssignMember Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};





