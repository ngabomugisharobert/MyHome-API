const TeamMember = require('../models/TeamMember');
const User = require('../models/User');

// Get all team members
const getTeamMembers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, role } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (status) whereClause.status = status;
    if (role) whereClause.role = role;

    const { count, rows: teamMembers } = await TeamMember.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    // Get statistics
    const totalMembers = await TeamMember.count();
    const activeMembers = await TeamMember.count({ where: { status: 'active' } });
    const totalHours = await TeamMember.sum('timesheetHours');
    const newThisMonth = await TeamMember.count({
      where: {
        createdAt: {
          [require('sequelize').Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1))
        }
      }
    });

    res.json({
      success: true,
      data: {
        teamMembers,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        },
        statistics: {
          totalMembers,
          activeMembers,
          totalHours: totalHours || 0,
          newThisMonth
        }
      }
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team members',
      error: error.message
    });
  }
};

// Get team member by ID
const getTeamMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const teamMember = await TeamMember.findByPk(id);

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    res.json({
      success: true,
      data: teamMember
    });
  } catch (error) {
    console.error('Error fetching team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team member',
      error: error.message
    });
  }
};

// Create new team member
const createTeamMember = async (req, res) => {
  try {
    const { name, email, role, status = 'active', signupLocation } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const teamMember = await TeamMember.create({
      name,
      email,
      role,
      status,
      signupLocation,
      joinDate: new Date(),
      lastActive: new Date(),
      timesheetHours: 0
    });

    res.status(201).json({
      success: true,
      message: 'Team member created successfully',
      data: teamMember
    });
  } catch (error) {
    console.error('Error creating team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create team member',
      error: error.message
    });
  }
};

// Update team member
const updateTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status, timesheetHours, signupLocation } = req.body;

    const teamMember = await TeamMember.findByPk(id);
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    await teamMember.update({
      name,
      email,
      role,
      status,
      timesheetHours,
      signupLocation,
      lastActive: new Date()
    });

    res.json({
      success: true,
      message: 'Team member updated successfully',
      data: teamMember
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update team member',
      error: error.message
    });
  }
};

// Delete team member
const deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const teamMember = await TeamMember.findByPk(id);

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    await teamMember.destroy();

    res.json({
      success: true,
      message: 'Team member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete team member',
      error: error.message
    });
  }
};

// Get team reports
const getTeamReports = async (req, res) => {
  try {
    const { startDate, endDate, facility } = req.query;

    let whereClause = {};
    if (startDate && endDate) {
      whereClause.createdAt = {
        [require('sequelize').Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const reports = await TeamMember.findAll({
      where: whereClause,
      attributes: [
        'role',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
        [require('sequelize').fn('SUM', require('sequelize').col('timesheetHours')), 'totalHours']
      ],
      group: ['role']
    });

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error generating team reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate team reports',
      error: error.message
    });
  }
};

module.exports = {
  getTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getTeamReports
};
