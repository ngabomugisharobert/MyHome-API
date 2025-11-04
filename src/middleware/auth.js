const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Get user details from database using Sequelize
    const userRecord = await User.findByPk(decoded.userId, {
      attributes: ['id', 'email', 'role', 'isActive', 'facilityId']
    });

    if (!userRecord) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    if (!userRecord.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }

    const user = userRecord.get({ plain: true });

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId || null
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

// Middleware to check user roles
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Middleware to check specific permissions
const authorizePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const userRole = req.user.role;
    const config = require('../config/config');
    
    // Admin has all permissions
    if (userRole === config.roles.ADMIN) {
      return next();
    }

    // Check if user's role has the required permission
    const rolePermissions = config.permissions[userRole] || [];
    if (!rolePermissions.includes(permission) && !rolePermissions.includes('all')) {
      return res.status(403).json({ 
        success: false, 
        message: `Permission '${permission}' required` 
      });
    }

    next();
  };
};

// Middleware to check if user is locked out
const checkAccountLock = async (req, res, next) => {
  try {
    const { query } = require('../config/database');
    
    const userResult = await query(
      'SELECT locked_until FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      if (user.locked_until && new Date() < new Date(user.locked_until)) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to multiple failed login attempts'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Account lock check error:', error);
    next();
  }
};

// Middleware to check if user can access their own resource or is admin
const authorizeSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const resourceUserId = req.params.userId || req.params.id;
  
  if (req.user.role === config.roles.ADMIN || req.user.id === parseInt(resourceUserId)) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied' 
    });
  }
};

module.exports = {
  authenticateToken,
  authorize,
  authorizePermission,
  authorizeSelfOrAdmin,
  checkAccountLock
};
