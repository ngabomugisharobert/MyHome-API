const { query } = require('../config/database');

// Get all facilities
const getAllFacilities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = 'WHERE f.is_active = true';
    let queryParams = [];
    
    if (search) {
      whereClause += ` AND (f.name ILIKE $1 OR f.address ILIKE $1)`;
      queryParams.push(`%${search}%`);
    }

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM facilities f
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Get facilities
    const facilitiesResult = await query(`
      SELECT f.id, f.name, f.address, f.phone, f.email, f.license_number,
             f.created_at, f.updated_at,
             COUNT(u.id) as user_count
      FROM facilities f
      LEFT JOIN users u ON f.id = u.facility_id AND u.is_active = true
      ${whereClause}
      GROUP BY f.id, f.name, f.address, f.phone, f.email, f.license_number, f.created_at, f.updated_at
      ORDER BY f.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);

    res.json({
      success: true,
      data: {
        facilities: facilitiesResult.rows.map(facility => ({
          id: facility.id,
          name: facility.name,
          address: facility.address,
          phone: facility.phone,
          email: facility.email,
          licenseNumber: facility.license_number,
          userCount: parseInt(facility.user_count),
          createdAt: facility.created_at,
          updatedAt: facility.updated_at
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get all facilities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get facilities'
    });
  }
};

// Get facility by ID
const getFacilityById = async (req, res) => {
  try {
    const facilityId = req.params.id;

    const facilityResult = await query(`
      SELECT f.id, f.name, f.address, f.phone, f.email, f.license_number,
             f.is_active, f.created_at, f.updated_at
      FROM facilities f
      WHERE f.id = $1
    `, [facilityId]);

    if (facilityResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    const facility = facilityResult.rows[0];

    // Get users in this facility
    const usersResult = await query(`
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at
      FROM users u
      WHERE u.facility_id = $1
      ORDER BY u.created_at DESC
    `, [facilityId]);

    res.json({
      success: true,
      data: {
        facility: {
          id: facility.id,
          name: facility.name,
          address: facility.address,
          phone: facility.phone,
          email: facility.email,
          licenseNumber: facility.license_number,
          isActive: facility.is_active,
          createdAt: facility.created_at,
          updatedAt: facility.updated_at,
          users: usersResult.rows.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.is_active,
            createdAt: user.created_at
          }))
        }
      }
    });
  } catch (error) {
    console.error('Get facility by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get facility'
    });
  }
};

// Create facility
const createFacility = async (req, res) => {
  try {
    const { name, address, phone, email, licenseNumber } = req.body;

    // Check if facility with same name already exists
    const existingFacility = await query('SELECT id FROM facilities WHERE name = $1', [name]);
    if (existingFacility.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Facility with this name already exists'
      });
    }

    const facilityResult = await query(`
      INSERT INTO facilities (name, address, phone, email, license_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, address, phone, email, license_number, is_active, created_at, updated_at
    `, [name, address, phone, email, licenseNumber]);

    const facility = facilityResult.rows[0];

    res.status(201).json({
      success: true,
      message: 'Facility created successfully',
      data: {
        facility: {
          id: facility.id,
          name: facility.name,
          address: facility.address,
          phone: facility.phone,
          email: facility.email,
          licenseNumber: facility.license_number,
          isActive: facility.is_active,
          createdAt: facility.created_at,
          updatedAt: facility.updated_at
        }
      }
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
    const facilityId = req.params.id;
    const { name, address, phone, email, licenseNumber } = req.body;

    // Check if facility exists
    const facilityResult = await query('SELECT id FROM facilities WHERE id = $1', [facilityId]);
    if (facilityResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Check if name is already taken by another facility
    if (name) {
      const nameCheck = await query('SELECT id FROM facilities WHERE name = $1 AND id != $2', [name, facilityId]);
      if (nameCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Facility name already in use'
        });
      }
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name);
      paramCount++;
    }
    if (address !== undefined) {
      updateFields.push(`address = $${paramCount}`);
      updateValues.push(address);
      paramCount++;
    }
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramCount}`);
      updateValues.push(phone);
      paramCount++;
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramCount}`);
      updateValues.push(email);
      paramCount++;
    }
    if (licenseNumber !== undefined) {
      updateFields.push(`license_number = $${paramCount}`);
      updateValues.push(licenseNumber);
      paramCount++;
    }

    if (updateFields.length > 0) {
      updateValues.push(facilityId);
      await query(`
        UPDATE facilities SET ${updateFields.join(', ')} WHERE id = $${paramCount}
      `, updateValues);
    }

    res.json({
      success: true,
      message: 'Facility updated successfully'
    });
  } catch (error) {
    console.error('Update facility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update facility'
    });
  }
};

// Deactivate facility
const deactivateFacility = async (req, res) => {
  try {
    const facilityId = req.params.id;

    const result = await query('UPDATE facilities SET is_active = false WHERE id = $1 RETURNING id', [facilityId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    res.json({
      success: true,
      message: 'Facility deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate facility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate facility'
    });
  }
};

// Activate facility
const activateFacility = async (req, res) => {
  try {
    const facilityId = req.params.id;

    const result = await query('UPDATE facilities SET is_active = true WHERE id = $1 RETURNING id', [facilityId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    res.json({
      success: true,
      message: 'Facility activated successfully'
    });
  } catch (error) {
    console.error('Activate facility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate facility'
    });
  }
};

module.exports = {
  getAllFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deactivateFacility,
  activateFacility
};
