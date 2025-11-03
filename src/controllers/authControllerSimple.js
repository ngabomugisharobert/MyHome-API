const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { createSession, updateSession, removeSession } = require('../middleware/sessionManager');

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: '24h' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    // Find user using Sequelize
    const user = await User.findOne({
      where: { email: email }
    });

    console.log('User found:', user ? 'Yes' : 'No');
    if (user) {
      console.log('User details:', {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      });
    }

    if (!user) {
      console.log('User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);
    
    // Create session
    const tokens = { accessToken, refreshToken };
    createSession(user.id, tokens);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          facilityId: user.facilityId,
          isActive: user.isActive,
          emailVerified: user.emailVerified
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// Register new user (Admin only)
const register = async (req, res) => {
  try {
    const { email, password, name, role, facilityId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash: hashedPassword,
      role: role || 'caregiver',
      facilityId,
      isActive: true,
      emailVerified: false
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          facilityId: user.facilityId
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, config.jwt.secret);
        removeSession(decoded.userId);
      } catch (error) {
        console.error('Error removing session:', error);
      }
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.secret);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId },
      config.jwt.secret,
      { expiresIn: '24h' }
    );

    // Update session with new token
    const newTokens = { accessToken, refreshToken };
    updateSession(decoded.userId, newTokens);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find user with Sequelize
    const user = await User.findByPk(userId, {
      attributes: [
        'id',
        'email',
        'name',
        'role',
        'facilityId',
        'isActive',
        'emailVerified',
        'createdAt',
        'updatedAt'
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          facilityId: user.facilityId,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

module.exports = {
  login,
  register,
  logout,
  refreshToken,
  getProfile
};
