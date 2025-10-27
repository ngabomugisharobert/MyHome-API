const { Op } = require('sequelize');
const Facility = require('../models/Facility');
const User = require('../models/User');

// Get all facilities
const getAllFacilities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = { isActive: true };
    
    // Apply facility filtering if user has a facilityId
    if (req.facilityFilter && req.facilityFilter.facilityId) {
      whereClause.id = req.facilityFilter.facilityId;
      console.log(`🔒 Filtering facilities by facilityId: ${req.facilityFilter.facilityId}`);
    }
    
    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { address: { [Op.iLike]: `%${search}%` } }
        ]
      };
    }

    // Get total count
    const total = await Facility.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);

    // Get facilities
    const facilities = await Facility.findAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        facilities: facilities,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get all facilities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch facilities'
    });
  }
};

// Get facility by ID
const getFacilityById = async (req, res) => {
  try {
    const { id } = req.params;

    const facility = await Facility.findByPk(id);

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    res.json({
      success: true,
      data: { facility }
    });
  } catch (error) {
    console.error('Get facility by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch facility'
    });
  }
};

// Create new facility
const createFacility = async (req, res) => {
  try {
    const { name, address, phone, email, licenseNumber, capacity, ownerId } = req.body;

    // Check if facility with same name already exists
    const existingFacility = await Facility.findOne({ where: { name } });
    if (existingFacility) {
      return res.status(409).json({
        success: false,
        message: 'Facility with this name already exists'
      });
    }

    // Validate owner if provided
    if (ownerId) {
      const owner = await User.findByPk(ownerId);
      if (!owner) {
        return res.status(400).json({
          success: false,
          message: 'Owner user not found'
        });
      }
      if (owner.role !== 'facility_owner' && owner.role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'User must be a facility owner or admin'
        });
      }
    }

    const facility = await Facility.create({
      name,
      address,
      phone,
      email,
      licenseNumber,
      capacity: capacity || 0,
      ownerId,
      status: 'pending',
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Facility created successfully',
      data: { facility }
    });
  } catch (error) {
    console.error('Create facility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create facility'
    });
  }
};

// Update facility
const updateFacility = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, email, capacity, description, isActive } = req.body;

    const facility = await Facility.findByPk(id);

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    await facility.update({
      name,
      address,
      phone,
      email,
      capacity,
      description,
      isActive
    });

    res.json({
      success: true,
      message: 'Facility updated successfully',
      data: { facility }
    });
  } catch (error) {
    console.error('Update facility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update facility'
    });
  }
};

// Delete facility
const deleteFacility = async (req, res) => {
  try {
    const { id } = req.params;

    const facility = await Facility.findByPk(id);

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    await facility.update({ isActive: false });

    res.json({
      success: true,
      message: 'Facility deactivated successfully'
    });
  } catch (error) {
    console.error('Delete facility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete facility'
    });
  }
};

// Get facility overview/dashboard
const getFacilityOverview = async (req, res) => {
  try {
    const { id } = req.params;

    const facility = await Facility.findByPk(id, {
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'name', 'email', 'role', 'isActive'],
          where: { isActive: true },
          required: false
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Calculate statistics
    const totalStaff = facility.users ? facility.users.length : 0;
    const activeStaff = facility.users ? facility.users.filter(user => user.isActive).length : 0;
    const staffByRole = facility.users ? facility.users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {}) : {};

    const overview = {
      facility: {
        id: facility.id,
        name: facility.name,
        address: facility.address,
        phone: facility.phone,
        email: facility.email,
        licenseNumber: facility.licenseNumber,
        capacity: facility.capacity,
        status: facility.status,
        isActive: facility.isActive,
        owner: facility.owner,
        createdAt: facility.createdAt,
        updatedAt: facility.updatedAt
      },
      statistics: {
        totalStaff,
        activeStaff,
        capacity: facility.capacity,
        utilizationRate: facility.capacity > 0 ? Math.round((totalStaff / facility.capacity) * 100) : 0,
        staffByRole
      }
    };

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Get facility overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get facility overview'
    });
  }
};

// Assign owner to facility
const assignOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { ownerId } = req.body;

    const facility = await Facility.findByPk(id);
    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    const owner = await User.findByPk(ownerId);
    if (!owner) {
      return res.status(400).json({
        success: false,
        message: 'Owner user not found'
      });
    }

    // Allow admin, supervisor, or facility_owner roles to be assigned as facility owners
    if (!['admin', 'supervisor', 'facility_owner'].includes(owner.role)) {
      return res.status(400).json({
        success: false,
        message: 'User must be an admin, supervisor, or facility owner'
      });
    }

    // Update the owner's facilityId to match the facility
    await owner.update({ facilityId: facility.id });
    
    // Update the facility with the new owner
    await facility.update({ ownerId, status: 'active' });

    res.json({
      success: true,
      message: 'Owner assigned successfully',
      data: { facility }
    });
  } catch (error) {
    console.error('Assign owner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign owner'
    });
  }
};

// Update facility status
const updateFacilityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'inactive', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: active, inactive, pending'
      });
    }

    const facility = await Facility.findByPk(id);
    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    await facility.update({ 
      status,
      isActive: status === 'active'
    });

    res.json({
      success: true,
      message: 'Facility status updated successfully',
      data: { facility }
    });
  } catch (error) {
    console.error('Update facility status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update facility status'
    });
  }
};

// Create facility with owner
const createFacilityWithOwner = async (req, res) => {
  try {
    const { 
      facilityData, 
      ownerData 
    } = req.body;

    const { name, address, phone, email, licenseNumber, capacity } = facilityData;
    const { name: ownerName, email: ownerEmail, password } = ownerData;

    // Check if facility with same name already exists
    const existingFacility = await Facility.findOne({ where: { name } });
    if (existingFacility) {
      return res.status(409).json({
        success: false,
        message: 'Facility with this name already exists'
      });
    }

    // Check if owner email already exists
    const existingOwner = await User.findOne({ where: { email: ownerEmail } });
    if (existingOwner) {
      return res.status(409).json({
        success: false,
        message: 'Owner email already exists'
      });
    }

    // Create the facility first
    const facility = await Facility.create({
      name,
      address,
      phone,
      email,
      licenseNumber,
      capacity: capacity || 0,
      status: 'pending',
      isActive: true
    });

    // Create the owner user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const owner = await User.create({
      name: ownerName,
      email: ownerEmail,
      passwordHash: hashedPassword,
      role: 'supervisor', // Use supervisor role for facility owners
      facilityId: facility.id,
      isActive: true,
      emailVerified: true
    });

    // Assign the owner to the facility
    await facility.update({ 
      ownerId: owner.id, 
      status: 'active' 
    });

    res.status(201).json({
      success: true,
      message: 'Facility and owner created successfully',
      data: { 
        facility,
        owner: {
          id: owner.id,
          name: owner.name,
          email: owner.email,
          role: owner.role
        }
      }
    });
  } catch (error) {
    console.error('Create facility with owner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create facility with owner'
    });
  }
};

// Get available users for facility assignment
const getAvailableUsers = async (req, res) => {
  try {
    // Get users who don't have a facility assigned or are admins
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { facilityId: null },
          { role: 'admin' }
        ],
        isActive: true
      },
      attributes: ['id', 'name', 'email', 'role', 'facilityId'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Get available users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available users'
    });
  }
};

module.exports = {
  getAllFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility,
  getFacilityOverview,
  assignOwner,
  updateFacilityStatus,
  createFacilityWithOwner,
  getAvailableUsers
};
