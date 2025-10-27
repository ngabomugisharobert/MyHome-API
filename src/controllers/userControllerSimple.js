const { Op } = require('sequelize');
const User = require('../models/User');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';

    let whereClause = {};
    
    // Apply facility filtering if user has a facilityId
    if (req.facilityFilter && req.facilityFilter.facilityId) {
      whereClause.facilityId = req.facilityFilter.facilityId;
      console.log(`🔒 Filtering users by facilityId: ${req.facilityFilter.facilityId}`);
    }
    
    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ]
      };
    }

    if (role) {
      whereClause.role = role;
    }

    // Get total count
    const total = await User.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);

    // Get users
    const users = await User.findAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'emailVerified', 'createdAt']
    });

    res.json({
      success: true,
      data: {
        users: users,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'emailVerified', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({
      name,
      email,
      role,
      isActive
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { 
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ isActive: false });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

// Assign user to facility
const assignUserToFacility = async (req, res) => {
  try {
    const { userId, facilityId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already assigned to a facility
    if (user.facilityId && user.facilityId !== facilityId) {
      return res.status(400).json({
        success: false,
        message: 'User is already assigned to a different facility'
      });
    }

    // Update user's facility assignment
    await user.update({ facilityId });

    res.json({
      success: true,
      message: 'User assigned to facility successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Assign user to facility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign user to facility'
    });
  }
};

// Remove user from facility
const removeUserFromFacility = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove facility assignment
    await user.update({ facilityId: null });

    res.json({
      success: true,
      message: 'User removed from facility successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Remove user from facility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove user from facility'
    });
  }
};

// Create user and assign to facility
const createUserForFacility = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      role, 
      facilityId 
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash: hashedPassword,
      role,
      facilityId,
      isActive: true,
      emailVerified: true
    });

    res.status(201).json({
      success: true,
      message: 'User created and assigned to facility successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Create user for facility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user for facility'
    });
  }
};

// Get users by facility with details
const getUsersByFacilityDetailed = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { role, status } = req.query;

    let whereClause = { facilityId };
    
    if (role) {
      whereClause.role = role;
    }
    
    if (status) {
      whereClause.isActive = status === 'active';
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'emailVerified', 'createdAt', 'lastLogin'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Get users by facility detailed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users by facility'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignUserToFacility,
  removeUserFromFacility,
  createUserForFacility,
  getUsersByFacilityDetailed
};
