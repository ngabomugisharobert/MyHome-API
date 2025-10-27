const { Op } = require('sequelize');
const User = require('../models/User');
const Facility = require('../models/Facility');

// Get facilities available to a doctor
const getDoctorFacilities = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify the user is a doctor
    const doctor = await User.findByPk(userId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: User is not a doctor'
      });
    }

    // Get all active facilities for doctor to choose from
    const facilities = await Facility.findAll({
      where: {
        status: 'active',
        isActive: true
      },
      attributes: ['id', 'name', 'address', 'phone', 'email', 'capacity'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { facilities }
    });
  } catch (error) {
    console.error('Get doctor facilities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get doctor facilities'
    });
  }
};

// Get facilities owned by a user
const getOwnerFacilities = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify the user is an owner (supervisor role with owned facilities)
    const owner = await User.findByPk(userId);
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get facilities owned by this user
    const facilities = await Facility.findAll({
      where: {
        ownerId: userId,
        status: 'active',
        isActive: true
      },
      attributes: ['id', 'name', 'address', 'phone', 'email', 'capacity', 'status'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { facilities }
    });
  } catch (error) {
    console.error('Get owner facilities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get owner facilities'
    });
  }
};

// Set doctor's selected facility for data access
const setDoctorFacility = async (req, res) => {
  try {
    const { userId } = req.params;
    const { facilityId } = req.body;
    
    // Verify the user is a doctor
    const doctor = await User.findByPk(userId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: User is not a doctor'
      });
    }

    // Verify the facility exists and is active
    if (facilityId) {
      const facility = await Facility.findByPk(facilityId);
      if (!facility || facility.status !== 'active' || !facility.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Facility not found or inactive'
        });
      }
    }

    // Update doctor's facility selection (this doesn't change their permanent facilityId)
    // We'll store this in a separate field or use session storage
    // For now, we'll update their facilityId temporarily
    await doctor.update({ facilityId });

    res.json({
      success: true,
      message: 'Doctor facility selection updated successfully',
      data: { facilityId }
    });
  } catch (error) {
    console.error('Set doctor facility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set doctor facility'
    });
  }
};

// Get user's accessible facilities based on role
const getUserAccessibleFacilities = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let facilities = [];

    switch (user.role) {
      case 'admin':
        // Admin can see all facilities
        facilities = await Facility.findAll({
          where: {
            status: 'active',
            isActive: true
          },
          attributes: ['id', 'name', 'address', 'phone', 'email', 'capacity'],
          order: [['name', 'ASC']]
        });
        break;

      case 'supervisor':
        // Supervisor (owner) can see their owned facilities
        facilities = await Facility.findAll({
          where: {
            ownerId: userId,
            status: 'active',
            isActive: true
          },
          attributes: ['id', 'name', 'address', 'phone', 'email', 'capacity'],
          order: [['name', 'ASC']]
        });
        break;

      case 'doctor':
        // Doctor can see all facilities (for selection)
        facilities = await Facility.findAll({
          where: {
            status: 'active',
            isActive: true
          },
          attributes: ['id', 'name', 'address', 'phone', 'email', 'capacity'],
          order: [['name', 'ASC']]
        });
        break;

      case 'caregiver':
        // Caregiver can only see their assigned facility
        if (user.facilityId) {
          const facility = await Facility.findByPk(user.facilityId);
          if (facility && facility.status === 'active' && facility.isActive) {
            facilities = [facility];
          }
        }
        break;

      default:
        return res.status(403).json({
          success: false,
          message: 'Invalid user role'
        });
    }

    res.json({
      success: true,
      data: { 
        facilities,
        userRole: user.role,
        currentFacilityId: user.facilityId
      }
    });
  } catch (error) {
    console.error('Get user accessible facilities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user accessible facilities'
    });
  }
};

module.exports = {
  getDoctorFacilities,
  getOwnerFacilities,
  setDoctorFacility,
  getUserAccessibleFacilities
};
