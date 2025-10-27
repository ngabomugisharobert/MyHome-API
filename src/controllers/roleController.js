const Role = require('../models/Role');
const User = require('../models/User');

// Get all roles
const getRoles = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';

    const { count, rows: roles } = await Role.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    // Get user count for each role
    const rolesWithUserCount = await Promise.all(
      roles.map(async (role) => {
        const userCount = await User.count({ where: { role: role.name } });
        return {
          ...role.toJSON(),
          userCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        roles: rolesWithUserCount,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      error: error.message
    });
  }
};

// Get role by ID
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findByPk(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const userCount = await User.count({ where: { role: role.name } });

    res.json({
      success: true,
      data: {
        ...role.toJSON(),
        userCount
      }
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role',
      error: error.message
    });
  }
};

// Create new role
const createRole = async (req, res) => {
  try {
    const { name, description, permissions, isActive = true } = req.body;

    // Check if role already exists
    const existingRole = await Role.findOne({ where: { name } });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists'
      });
    }

    const role = await Role.create({
      name,
      description,
      permissions,
      isActive
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create role',
      error: error.message
    });
  }
};

// Update role
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, isActive } = req.body;

    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Check if name is being changed and if it conflicts
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ where: { name } });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'Role with this name already exists'
        });
      }
    }

    await role.update({
      name,
      description,
      permissions,
      isActive
    });

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: role
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: error.message
    });
  }
};

// Delete role
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findByPk(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Check if role is being used by any users
    const userCount = await User.count({ where: { role: role.name } });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete role that is assigned to users'
      });
    }

    await role.destroy();

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete role',
      error: error.message
    });
  }
};

// Get available permissions
const getPermissions = async (req, res) => {
  try {
    const permissions = [
      { id: '1', name: 'View Dashboard', description: 'Access to main dashboard', category: 'Dashboard' },
      { id: '2', name: 'Manage Users', description: 'Create, edit, delete users', category: 'User Management' },
      { id: '3', name: 'View Users', description: 'View user information', category: 'User Management' },
      { id: '4', name: 'Manage Facilities', description: 'Create, edit, delete facilities', category: 'Facility Management' },
      { id: '5', name: 'View Facilities', description: 'View facility information', category: 'Facility Management' },
      { id: '6', name: 'Add Notes', description: 'Add patient notes', category: 'Patient Care' },
      { id: '7', name: 'Delete Notes', description: 'Delete patient notes', category: 'Patient Care' },
      { id: '8', name: 'View Reports', description: 'Access to reports and analytics', category: 'Reporting' },
      { id: '9', name: 'Manage Roles', description: 'Create and modify user roles', category: 'Administration' },
      { id: '10', name: 'System Settings', description: 'Access to system configuration', category: 'Administration' },
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
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getPermissions
};
