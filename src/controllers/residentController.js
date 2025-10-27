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
        { name: { [Op.iLike]: `%${search}%` } },
        { room: { [Op.iLike]: `%${search}%` } }
      ];
    }

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

    const resident = await Resident.findByPk(id, {
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
    const {
      name,
      dateOfBirth,
      gender,
      room,
      facilityId,
      admissionDate,
      medicalConditions,
      allergies,
      emergencyContact,
      emergencyPhone,
      notes
    } = req.body;

    // Use facilityId from request or user's facility
    const residentFacilityId = facilityId || req.facilityFilter?.facilityId;

    if (!residentFacilityId) {
      return res.status(400).json({
        success: false,
        message: 'Facility ID is required'
      });
    }

    const resident = await Resident.create({
      name,
      dateOfBirth,
      gender,
      room,
      facilityId: residentFacilityId,
      admissionDate,
      medicalConditions,
      allergies,
      emergencyContact,
      emergencyPhone,
      notes,
      status: 'active'
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

    const resident = await Resident.findByPk(id);

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

// Delete resident
const deleteResident = async (req, res) => {
  try {
    const { id } = req.params;

    const resident = await Resident.findByPk(id);

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
        message: 'Access denied: You can only delete residents from your facility'
      });
    }

    await resident.destroy();

    res.json({
      success: true,
      message: 'Resident deleted successfully'
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
