const AccessRule = require('../models/AccessRule');
const User = require('../models/User');
const Facility = require('../models/Facility');
const Resident = require('../models/Resident');

// Get all access rules
const getAccessRules = async (req, res) => {
  try {
    const { page = 1, limit = 10, userId, facilityId, isActive } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (userId) whereClause.userId = userId;
    if (facilityId) whereClause.facilityId = facilityId;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';

    const { count, rows: accessRules } = await AccessRule.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'role'],
          as: 'user'
        },
        {
          model: Facility,
          attributes: ['id', 'name', 'location'],
          as: 'facility'
        },
        {
          model: Resident,
          attributes: ['id', 'name', 'room'],
          as: 'resident',
          required: false
        }
      ]
    });

    // Get statistics
    const totalRules = await AccessRule.count();
    const activeRules = await AccessRule.count({ where: { isActive: true } });
    const totalFacilities = await Facility.count();
    const totalResidents = await Resident.count();

    res.json({
      success: true,
      data: {
        accessRules,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        },
        statistics: {
          totalRules,
          activeRules,
          totalFacilities,
          totalResidents
        }
      }
    });
  } catch (error) {
    console.error('Error fetching access rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch access rules',
      error: error.message
    });
  }
};

// Get access rule by ID
const getAccessRuleById = async (req, res) => {
  try {
    const { id } = req.params;
    const accessRule = await AccessRule.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'role'],
          as: 'user'
        },
        {
          model: Facility,
          attributes: ['id', 'name', 'location'],
          as: 'facility'
        },
        {
          model: Resident,
          attributes: ['id', 'name', 'room'],
          as: 'resident',
          required: false
        }
      ]
    });

    if (!accessRule) {
      return res.status(404).json({
        success: false,
        message: 'Access rule not found'
      });
    }

    res.json({
      success: true,
      data: accessRule
    });
  } catch (error) {
    console.error('Error fetching access rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch access rule',
      error: error.message
    });
  }
};

// Create new access rule
const createAccessRule = async (req, res) => {
  try {
    const { userId, facilityId, residentId, permissions, isActive = true } = req.body;

    // Validate user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate facility exists
    const facility = await Facility.findByPk(facilityId);
    if (!facility) {
      return res.status(400).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Validate resident exists if provided
    if (residentId) {
      const resident = await Resident.findByPk(residentId);
      if (!resident) {
        return res.status(400).json({
          success: false,
          message: 'Resident not found'
        });
      }
    }

    // Check if access rule already exists
    const existingRule = await AccessRule.findOne({
      where: {
        userId,
        facilityId,
        residentId: residentId || null
      }
    });

    if (existingRule) {
      return res.status(400).json({
        success: false,
        message: 'Access rule already exists for this user, facility, and resident combination'
      });
    }

    const accessRule = await AccessRule.create({
      userId,
      facilityId,
      residentId: residentId || null,
      permissions,
      isActive
    });

    res.status(201).json({
      success: true,
      message: 'Access rule created successfully',
      data: accessRule
    });
  } catch (error) {
    console.error('Error creating access rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create access rule',
      error: error.message
    });
  }
};

// Update access rule
const updateAccessRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions, isActive } = req.body;

    const accessRule = await AccessRule.findByPk(id);
    if (!accessRule) {
      return res.status(404).json({
        success: false,
        message: 'Access rule not found'
      });
    }

    await accessRule.update({
      permissions,
      isActive
    });

    res.json({
      success: true,
      message: 'Access rule updated successfully',
      data: accessRule
    });
  } catch (error) {
    console.error('Error updating access rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update access rule',
      error: error.message
    });
  }
};

// Delete access rule
const deleteAccessRule = async (req, res) => {
  try {
    const { id } = req.params;
    const accessRule = await AccessRule.findByPk(id);

    if (!accessRule) {
      return res.status(404).json({
        success: false,
        message: 'Access rule not found'
      });
    }

    await accessRule.destroy();

    res.json({
      success: true,
      message: 'Access rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting access rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete access rule',
      error: error.message
    });
  }
};

// Get available permissions
const getAvailablePermissions = async (req, res) => {
  try {
    const permissions = [
      { id: 'view', name: 'View', description: 'View information and data' },
      { id: 'edit', name: 'Edit', description: 'Modify information and data' },
      { id: 'add_notes', name: 'Add Notes', description: 'Add patient notes and observations' },
      { id: 'delete_notes', name: 'Delete Notes', description: 'Remove patient notes' },
      { id: 'manage', name: 'Manage', description: 'Manage users and settings' },
      { id: 'reports', name: 'Reports', description: 'Access reports and analytics' },
    ];

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions',
      error: error.message
    });
  }
};

module.exports = {
  getAccessRules,
  getAccessRuleById,
  createAccessRule,
  updateAccessRule,
  deleteAccessRule,
  getAvailablePermissions
};
