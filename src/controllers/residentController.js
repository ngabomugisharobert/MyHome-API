const { Op } = require('sequelize');
const Resident = require('../models/Resident');
const Facility = require('../models/Facility');

// Get all residents for a facility
const getAllResidents = async (req, res) => {
  try {
    console.log('🔍 getAllResidents called with:', {
      user: req.user,
      facilityFilter: req.facilityFilter,
      query: req.query
    });
    
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
      console.log('🔍 Applied facility filter:', whereClause);
    }

    // Apply status filter
    if (status) {
      whereClause.status = status;
    }

    // Apply search filter
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { roomNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Exclude soft-deleted records
    whereClause.deletedAt = null;

    console.log('🔍 Querying residents with whereClause:', whereClause);
    
    const { count, rows: residents } = await Resident.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    console.log('🔍 Query result:', { count, residentsCount: residents.length });

    res.json({
      success: true,
      data: {
        residents,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get residents error:', error);
    console.error('Error details:', {
      message: error.message,
      sql: error.sql,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get residents',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get resident by ID
const getResidentById = async (req, res) => {
  try {
    const { id } = req.params;

    const resident = await Resident.findOne({
      where: {
        id,
        deletedAt: null
      },
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'Resident not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && resident.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view residents from your facility'
      });
    }

    res.json({
      success: true,
      data: { resident }
    });
  } catch (error) {
    console.error('Get resident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get resident'
    });
  }
};

// Create new resident
const createResident = async (req, res) => {
  try {
    console.log('🔍 Create resident - User:', req.user?.email, 'Role:', req.user?.role);
    console.log('🔍 Request body facilityId:', req.body.facilityId);
    console.log('🔍 Facility filter:', req.facilityFilter);

    const {
      firstName,
      lastName,
      dob,
      gender,
      photoUrl,
      admissionDate,
      dischargeDate,
      roomNumber,
      facilityId,
      primaryPhysician,
      emergencyContactName,
      emergencyContactPhone,
      diagnosis,
      allergies,
      dietaryRestrictions,
      mobilityLevel,
      careLevel,
      insuranceProvider,
      policyNumber,
      status
    } = req.body;

    // Use facilityId from request, facilityFilter, or user's facility
    let residentFacilityId = facilityId || req.facilityFilter?.facilityId || req.user?.facilityId;

    console.log('🔍 Initial residentFacilityId:', residentFacilityId);

    // If still no facilityId and user is a supervisor (owner), try to get their owned facilities
    if (!residentFacilityId && req.user?.role === 'supervisor') {
      console.log('🔍 Fetching owned facilities for supervisor:', req.user.id);
      const Facility = require('../models/Facility');
      const ownedFacilities = await Facility.findAll({
        where: {
          ownerId: req.user.id,
          status: 'active',
          isActive: true
        },
        limit: 1,
        attributes: ['id', 'name']
      });
      
      console.log('🔍 Owned facilities found:', ownedFacilities.length);
      
      if (ownedFacilities.length > 0) {
        residentFacilityId = ownedFacilities[0].id;
        console.log('✅ Using owned facility:', ownedFacilities[0].id, ownedFacilities[0].name);
      }
    }

    console.log('🔍 Final residentFacilityId:', residentFacilityId);

    if (!residentFacilityId) {
      console.error('❌ No facility ID found. User:', req.user);
      return res.status(400).json({
        success: false,
        message: 'Facility ID is required. Please ensure you have access to a facility. If you are a facility owner, please make sure your facility is properly set up.'
      });
    }

    const resident = await Resident.create({
      firstName: firstName || '',
      lastName: lastName || '',
      dob,
      gender,
      photoUrl,
      admissionDate,
      dischargeDate,
      roomNumber,
      facilityId: residentFacilityId,
      primaryPhysician,
      emergencyContactName,
      emergencyContactPhone,
      diagnosis,
      allergies,
      dietaryRestrictions,
      mobilityLevel,
      careLevel,
      insuranceProvider,
      policyNumber,
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Resident created successfully',
      data: { resident }
    });
  } catch (error) {
    console.error('Create resident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create resident'
    });
  }
};

// Update resident
const updateResident = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const resident = await Resident.findOne({
      where: {
        id,
        deletedAt: null
      }
    });

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'Resident not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && resident.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update residents from your facility'
      });
    }

    // Prevent updating deletedAt through this endpoint
    delete updateData.deletedAt;

    await resident.update(updateData);

    res.json({
      success: true,
      message: 'Resident updated successfully',
      data: { resident }
    });
  } catch (error) {
    console.error('Update resident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update resident'
    });
  }
};

// Soft delete resident (doesn't permanently delete)
const deleteResident = async (req, res) => {
  try {
    const { id } = req.params;

    // Find resident that is not already soft-deleted
    const resident = await Resident.findOne({
      where: {
        id,
        deletedAt: null
      }
    });

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'Resident not found or already deleted'
      });
    }

    // Check facility access
    if (req.facilityFilter && resident.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete residents from your facility'
      });
    }

    // Soft delete: set deletedAt timestamp instead of destroying
    await resident.update({
      deletedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Resident deleted successfully (soft delete)'
    });
  } catch (error) {
    console.error('Delete resident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resident'
    });
  }
};

// Get residents statistics
const getResidentsStats = async (req, res) => {
  try {
    const whereClause = {};
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    const totalResidents = await Resident.count({ where: whereClause });
    const activeResidents = await Resident.count({ 
      where: { ...whereClause, status: 'active' } 
    });
    const inactiveResidents = await Resident.count({ 
      where: { ...whereClause, status: 'inactive' } 
    });
    const dischargedResidents = await Resident.count({ 
      where: { ...whereClause, status: 'discharged' } 
    });

    res.json({
      success: true,
      data: {
        totalResidents,
        activeResidents,
        inactiveResidents,
        dischargedResidents
      }
    });
  } catch (error) {
    console.error('Get residents stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get residents statistics'
    });
  }
};

module.exports = {
  getAllResidents,
  getResidentById,
  createResident,
  updateResident,
  deleteResident,
  getResidentsStats
};
