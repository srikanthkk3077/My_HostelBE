const Room = require('../models/Room');
const Member = require('../models/Member');

// @desc    Create new room
// @route   POST /api/rooms
// @access  Private (Merchant only)
exports.createRoom = async (req, res) => {
  try {
    const { roomNumber, floor, pricePerMonth, roomType, roomCapacity } = req.body;

    // Check if room number already exists for this owner
    const existingRoom = await Room.findOne({
      roomNumber,
      hostelOwner: req.user._id,
    });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'A room with this number already exists in your hostel',
      });
    }

    const room = await Room.create({
      roomNumber,
      floor,
      pricePerMonth,
      roomType,
      roomCapacity,
      hostelOwner: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all rooms for the logged-in hostel owner
// @route   GET /api/rooms
// @access  Private (Merchant only)
exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ hostelOwner: req.user._id }).lean();

    // Calculate occupants dynamically for each room
    const roomsWithOccupants = await Promise.all(
      rooms.map(async (room) => {
        const members = await Member.find({
          room: room.roomNumber,
          hostelOwner: req.user._id,
        }).select('name mobile joiningDate bed');
        return {
          ...room,
          occupants: members.length,
          members,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: roomsWithOccupants.length,
      data: roomsWithOccupants,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single room by ID
// @route   GET /api/rooms/:id
// @access  Private (Merchant only)
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, hostelOwner: req.user._id }).lean();

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const members = await Member.find({
      room: room.roomNumber,
      hostelOwner: req.user._id,
    }).select('name mobile joiningDate bed _id');

    res.status(200).json({
      success: true,
      data: {
        ...room,
        occupants: members.length,
        members,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a room
// @route   PUT /api/rooms/:id
// @access  Private (Merchant only)
exports.updateRoom = async (req, res) => {
  try {
    let room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Make sure user is room owner
    if (room.hostelOwner.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this room' });
    }

    // Guard: Check if capacity is being reduced below current occupants
    if (req.body.roomCapacity !== undefined) {
      const newCapacity = Number(req.body.roomCapacity);
      const currentMembers = await Member.find({
        room: room.roomNumber,
        hostelOwner: req.user._id,
      }).select('name _id bed');

      const currentOccupants = currentMembers.length;

      if (newCapacity < currentOccupants) {
        const overCount = currentOccupants - newCapacity;
        return res.status(400).json({
          success: false,
          code: 'OVER_CAPACITY',
          message: `Cannot reduce capacity to ${newCapacity}. There are ${currentOccupants} members currently in this room. Please transfer ${overCount} member(s) to another room first.`,
          overCapacityCount: overCount,
          currentOccupants,
          newCapacity,
          members: currentMembers,
        });
      }
    }

    room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete a room
// @route   DELETE /api/rooms/:id
// @access  Private (Merchant only)
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Make sure user is room owner
    if (room.hostelOwner.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this room' });
    }

    await room.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Room deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
