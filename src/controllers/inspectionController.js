const { Op } = require('sequelize');
const Inspection = require('../models/Inspection');
const Facility = require('../models/Facility');

// Get all inspections for a facility
const getAllInspections = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, search } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    // Apply filters
    if (type) {
      whereClause.type = type;
    }
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause[Op.or] = [
        { inspector: { [Op.iLike]: `%${search}%` } },
        { findings: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: inspections } = await Inspection.findAndCountAll({
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
      order: [['inspectionDate', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        inspections,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get inspections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inspections'
    });
  }
};

// Get inspection by ID
const getInspectionById = async (req, res) => {
  try {
    const { id } = req.params;

    const inspection = await Inspection.findByPk(id, {
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && inspection.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view inspections from your facility'
      });
    }

    res.json({
      success: true,
      data: { inspection }
    });
  } catch (error) {
    console.error('Get inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inspection'
    });
  }
};

// Create new inspection
const createInspection = async (req, res) => {
  try {
    const {
      facilityId,
      inspectionDate,
      inspector,
      inspectorTitle,
      type,
      findings,
      violations,
      recommendations,
      correctiveActions,
      followUpDate,
      photos,
      notes
    } = req.body;

    // Use facilityId from request or user's facility
    const inspectionFacilityId = facilityId || req.facilityFilter?.facilityId;

    if (!inspectionFacilityId) {
      return res.status(400).json({
        success: false,
        message: 'Facility ID is required'
      });
    }

    const inspection = await Inspection.create({
      facilityId: inspectionFacilityId,
      inspectionDate,
      inspector,
      inspectorTitle,
      type: type || 'routine',
      status: 'scheduled',
      findings,
      violations: violations || [],
      recommendations,
      correctiveActions,
      followUpDate,
      photos: photos || [],
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Inspection created successfully',
      data: { inspection }
    });
  } catch (error) {
    console.error('Create inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create inspection'
    });
  }
};

// Update inspection
const updateInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const inspection = await Inspection.findByPk(id);

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && inspection.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update inspections from your facility'
      });
    }

    // If inspection is being completed, calculate compliance
    if (updateData.status === 'completed' && inspection.status !== 'completed') {
      if (updateData.score !== undefined) {
        updateData.isCompliant = updateData.score >= 80; // 80% threshold for compliance
      }
    }

    await inspection.update(updateData);

    res.json({
      success: true,
      message: 'Inspection updated successfully',
      data: { inspection }
    });
  } catch (error) {
    console.error('Update inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inspection'
    });
  }
};

// Delete inspection
const deleteInspection = async (req, res) => {
  try {
    const { id } = req.params;

    const inspection = await Inspection.findByPk(id);

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    // Check facility access
    if (req.facilityFilter && inspection.facilityId !== req.facilityFilter.facilityId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete inspections from your facility'
      });
    }

    await inspection.destroy();

    res.json({
      success: true,
      message: 'Inspection deleted successfully'
    });
  } catch (error) {
    console.error('Delete inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inspection'
    });
  }
};

// Get upcoming inspections
const getUpcomingInspections = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + parseInt(days));

    const whereClause = {
      inspectionDate: {
        [Op.gte]: new Date(),
        [Op.lte]: upcomingDate
      },
      status: { [Op.in]: ['scheduled', 'in_progress'] }
    };
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    const inspections = await Inspection.findAll({
      where: whereClause,
      include: [
        {
          model: Facility,
          as: 'facility',
          attributes: ['id', 'name']
        }
      ],
      order: [['inspectionDate', 'ASC']]
    });

    res.json({
      success: true,
      data: { inspections }
    });
  } catch (error) {
    console.error('Get upcoming inspections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming inspections'
    });
  }
};

// Get inspection statistics
const getInspectionStats = async (req, res) => {
  try {
    const whereClause = {};
    
    // Apply facility filter if user has facilityId
    if (req.facilityFilter) {
      whereClause.facilityId = req.facilityFilter.facilityId;
    }

    const totalInspections = await Inspection.count({ where: whereClause });
    const completedInspections = await Inspection.count({ 
      where: { ...whereClause, status: 'completed' } 
    });
    const scheduledInspections = await Inspection.count({ 
      where: { ...whereClause, status: 'scheduled' } 
    });
    const compliantInspections = await Inspection.count({
      where: { ...whereClause, isCompliant: true }
    });
    const nonCompliantInspections = await Inspection.count({
      where: { ...whereClause, isCompliant: false }
    });

    // Calculate average score
    const completedWithScores = await Inspection.findAll({
      where: { ...whereClause, status: 'completed', score: { [Op.ne]: null } },
      attributes: ['score']
    });

    const averageScore = completedWithScores.length > 0 
      ? Math.round(completedWithScores.reduce((sum, inspection) => sum + inspection.score, 0) / completedWithScores.length)
      : 0;

    res.json({
      success: true,
      data: {
        totalInspections,
        completedInspections,
        scheduledInspections,
        compliantInspections,
        nonCompliantInspections,
        averageScore
      }
    });
  } catch (error) {
    console.error('Get inspection stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inspection statistics'
    });
  }
};

module.exports = {
  getAllInspections,
  getInspectionById,
  createInspection,
  updateInspection,
  deleteInspection,
  getUpcomingInspections,
  getInspectionStats
};




