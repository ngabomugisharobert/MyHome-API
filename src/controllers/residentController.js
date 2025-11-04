const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Resident = require('../models/Resident');
const Facility = require('../models/Facility');
const User = require('../models/User');

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

    // Exclude soft-deleted records - combine with existing conditions properly
    let finalWhere = whereClause;
    
    // If we have Op.or, we need to wrap it in Op.and to combine with deletedAt
    if (whereClause[Op.or]) {
      finalWhere = {
        [Op.and]: [
          { [Op.or]: whereClause[Op.or] },
          { deletedAt: null }
        ]
      };
    } else {
      // No search, just add deletedAt condition
      finalWhere = {
        ...whereClause,
        deletedAt: null
      };
    }
    console.log('🔍 Querying residents with whereClause:', finalWhere);
    
    const { count, rows: residents } = await Resident.findAndCountAll({
      where: finalWhere,
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sequelize.literal('"Resident"."createdAt"'), 'DESC']]
    });
    
    console.log('🔍 Query result:', { count, residentsCount: residents.length });
    
    // Ensure we always return an array, even if empty
    const residentsList = residents || [];

    res.json({
      success: true,
      data: {
        residents: residentsList,
        pagination: {
          total: count || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil((count || 0) / limit)
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

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    // Validate UUID fields
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (primaryPhysician && primaryPhysician.trim() && !uuidRegex.test(primaryPhysician.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Primary physician must be a valid UUID. Please select a user from the list or leave it empty.'
      });
    }

    // Convert date strings to Date objects if provided (handle invalid dates)
    let dobDate = null;
    if (dob && dob.trim()) {
      const parsedDob = new Date(dob);
      if (!isNaN(parsedDob.getTime())) {
        dobDate = parsedDob;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid date of birth format'
        });
      }
    }

    let admissionDateObj = null;
    if (admissionDate && admissionDate.trim()) {
      const parsedDate = new Date(admissionDate);
      if (!isNaN(parsedDate.getTime())) {
        admissionDateObj = parsedDate;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid admission date format'
        });
      }
    }

    let dischargeDateObj = null;
    if (dischargeDate && dischargeDate.trim()) {
      const parsedDate = new Date(dischargeDate);
      if (!isNaN(parsedDate.getTime())) {
        dischargeDateObj = parsedDate;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid discharge date format'
        });
      }
    }

    // Validate date logic
    if (admissionDateObj && dischargeDateObj && admissionDateObj > dischargeDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Discharge date cannot be earlier than admission date'
      });
    }

    // Create resident data object - convert empty strings to null for optional fields
    const residentData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dob: dobDate,
      gender: (gender && ['male', 'female', 'other'].includes(gender)) ? gender : null,
      photoUrl: photoUrl && photoUrl.trim() ? photoUrl.trim() : null,
      admissionDate: admissionDateObj,
      dischargeDate: dischargeDateObj,
      roomNumber: roomNumber && roomNumber.trim() ? roomNumber.trim() : null,
      facilityId: residentFacilityId,
      primaryPhysician: (primaryPhysician && primaryPhysician.trim() && uuidRegex.test(primaryPhysician.trim())) 
        ? primaryPhysician.trim() 
        : null,
      emergencyContactName: emergencyContactName && emergencyContactName.trim() ? emergencyContactName.trim() : null,
      emergencyContactPhone: emergencyContactPhone && emergencyContactPhone.trim() ? emergencyContactPhone.trim() : null,
      diagnosis: diagnosis && diagnosis.trim() ? diagnosis.trim() : null,
      allergies: allergies && allergies.trim() ? allergies.trim() : null,
      dietaryRestrictions: dietaryRestrictions && dietaryRestrictions.trim() ? dietaryRestrictions.trim() : null,
      mobilityLevel: (mobilityLevel && ['independent', 'assisted', 'wheelchair', 'bedridden'].includes(mobilityLevel)) 
        ? mobilityLevel 
        : null,
      careLevel: (careLevel && ['independent', 'assisted_living', 'memory_care', 'skilled_nursing', 'hospice'].includes(careLevel)) 
        ? careLevel 
        : null,
      insuranceProvider: insuranceProvider && insuranceProvider.trim() ? insuranceProvider.trim() : null,
      policyNumber: policyNumber && policyNumber.trim() ? policyNumber.trim() : null,
      status: (status && ['active', 'inactive', 'discharged'].includes(status)) ? status : 'active'
    };

    console.log('📤 Creating resident with data:', JSON.stringify(residentData, null, 2));

    const resident = await Resident.create(residentData);

    console.log('✅ Resident created successfully:', resident.id);
    
    res.status(201).json({
      success: true,
      message: 'Resident created successfully',
      data: { resident }
    });
  } catch (error) {
    console.error('❌ Create resident error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      sql: error.sql,
      original: error.original?.message,
      stack: error.stack
    });
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => e.message)
      });
    }
    
    // Handle foreign key constraint errors
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid facility ID or related reference'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create resident',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Validate UUID for primaryPhysician if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (updateData.primaryPhysician && !uuidRegex.test(updateData.primaryPhysician)) {
      return res.status(400).json({
        success: false,
        message: 'Primary physician must be a valid UUID. Please select a user from the list or leave it empty.'
      });
    }

    // Convert date strings to Date objects if provided
    if (updateData.dob) updateData.dob = new Date(updateData.dob);
    if (updateData.admissionDate) updateData.admissionDate = new Date(updateData.admissionDate);
    if (updateData.dischargeDate) updateData.dischargeDate = new Date(updateData.dischargeDate);

    // Clean up empty strings to null for optional fields
    const optionalFields = ['photoUrl', 'roomNumber', 'primaryPhysician', 'emergencyContactName', 
                            'emergencyContactPhone', 'diagnosis', 'allergies', 'dietaryRestrictions',
                            'mobilityLevel', 'careLevel', 'insuranceProvider', 'policyNumber'];
    optionalFields.forEach(field => {
      if (updateData[field] === '') {
        updateData[field] = null;
      }
    });

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

// Get available physicians (doctors) for primary physician selection
const getAvailablePhysicians = async (req, res) => {
  try {
    let whereClause = {
      role: 'doctor',
      isActive: true
    };

    // Filter by facility if user has facilityId (to show only doctors from same facility)
    if (req.facilityFilter && req.facilityFilter.facilityId) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    const physicians = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'role'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { physicians }
    });
  } catch (error) {
    console.error('Get available physicians error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available physicians'
    });
  }
};

module.exports = {
  getAllResidents,
  getResidentById,
  createResident,
  updateResident,
  deleteResident,
  getResidentsStats,
  getAvailablePhysicians
};
