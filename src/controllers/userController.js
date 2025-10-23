const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = '';
    let queryParams = [];
    
    if (search) {
      whereClause = `WHERE (u.name ILIKE $1 OR u.email ILIKE $1)`;
      queryParams.push(`%${search}%`);
    }

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Get users
    const usersResult = await query(`
      SELECT u.id, u.email, u.name, u.role, u.is_active,
             u.email_verified, u.created_at, u.last_login,
             up.phone, up.city, up.country
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);

    res.json({
      success: true,
      data: {
        users: usersResult.rows.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.is_active,
          emailVerified: user.email_verified,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          profile: {
            phone: user.phone,
            city: user.city,
            country: user.country
          }
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
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const userResult = await query(`
      SELECT u.id, u.email, u.name, u.role, u.is_active,
             u.email_verified, u.created_at, u.last_login,
             up.phone, up.address, up.city, up.state, up.country, up.postal_code,
             up.date_of_birth, up.bio, up.avatar_url
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.is_active,
          emailVerified: user.email_verified,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          profile: {
            phone: user.phone,
            address: user.address,
            city: user.city,
            state: user.state,
            country: user.country,
            postalCode: user.postal_code,
            dateOfBirth: user.date_of_birth,
            bio: user.bio,
            avatarUrl: user.avatar_url
          }
        }
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, phone, address, city, state, country, postalCode, dateOfBirth, bio, avatarUrl } = req.body;

    // Check if user exists
    const userResult = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user basic info
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name);
      paramCount++;
    }

    if (email !== undefined) {
      // Check if email is already taken by another user
      const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use'
        });
      }
      updateFields.push(`email = $${paramCount}`);
      updateValues.push(email);
      paramCount++;
    }

    if (updateFields.length > 0) {
      updateValues.push(userId);
      await query(`
        UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}
      `, updateValues);
    }

    // Update or create user profile
    const profileResult = await query('SELECT id FROM user_profiles WHERE user_id = $1', [userId]);
    
    if (profileResult.rows.length > 0) {
      // Update existing profile
      const profileUpdateFields = [];
      const profileUpdateValues = [];
      let profileParamCount = 1;

      if (phone !== undefined) {
        profileUpdateFields.push(`phone = $${profileParamCount}`);
        profileUpdateValues.push(phone);
        profileParamCount++;
      }
      if (address !== undefined) {
        profileUpdateFields.push(`address = $${profileParamCount}`);
        profileUpdateValues.push(address);
        profileParamCount++;
      }
      if (city !== undefined) {
        profileUpdateFields.push(`city = $${profileParamCount}`);
        profileUpdateValues.push(city);
        profileParamCount++;
      }
      if (state !== undefined) {
        profileUpdateFields.push(`state = $${profileParamCount}`);
        profileUpdateValues.push(state);
        profileParamCount++;
      }
      if (country !== undefined) {
        profileUpdateFields.push(`country = $${profileParamCount}`);
        profileUpdateValues.push(country);
        profileParamCount++;
      }
      if (postalCode !== undefined) {
        profileUpdateFields.push(`postal_code = $${profileParamCount}`);
        profileUpdateValues.push(postalCode);
        profileParamCount++;
      }
      if (dateOfBirth !== undefined) {
        profileUpdateFields.push(`date_of_birth = $${profileParamCount}`);
        profileUpdateValues.push(dateOfBirth);
        profileParamCount++;
      }
      if (bio !== undefined) {
        profileUpdateFields.push(`bio = $${profileParamCount}`);
        profileUpdateValues.push(bio);
        profileParamCount++;
      }
      if (avatarUrl !== undefined) {
        profileUpdateFields.push(`avatar_url = $${profileParamCount}`);
        profileUpdateValues.push(avatarUrl);
        profileParamCount++;
      }

      if (profileUpdateFields.length > 0) {
        profileUpdateValues.push(userId);
        await query(`
          UPDATE user_profiles SET ${profileUpdateFields.join(', ')} WHERE user_id = $${profileParamCount}
        `, profileUpdateValues);
      }
    } else {
      // Create new profile
      await query(`
        INSERT INTO user_profiles (user_id, phone, address, city, state, country, postal_code, date_of_birth, bio, avatar_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [userId, phone, address, city, state, country, postalCode, dateOfBirth, bio, avatarUrl]);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;

    // Get user's current password hash
    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// Update user role (admin only)
const updateUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    const validRoles = ['admin', 'user', 'moderator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const result = await query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id', [role, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
};

// Deactivate user (admin only)
const deactivateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await query('UPDATE users SET is_active = false WHERE id = $1 RETURNING id', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user'
    });
  }
};

// Activate user (admin only)
const activateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await query('UPDATE users SET is_active = true WHERE id = $1 RETURNING id', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User activated successfully'
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate user'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateProfile,
  changePassword,
  updateUserRole,
  deactivateUser,
  activateUser
};
