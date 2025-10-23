const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorize, authorizeSelfOrAdmin } = require('../middleware/auth');
const { 
  validateUserUpdate, 
  validatePasswordChange, 
  validateId, 
  validatePagination 
} = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', authorize('admin'), validatePagination, userController.getAllUsers);

// Get user by ID (admin or self)
router.get('/:id', authorizeSelfOrAdmin, validateId, userController.getUserById);

// Update user profile (admin or self)
router.put('/:id', authorizeSelfOrAdmin, validateId, validateUserUpdate, userController.updateProfile);

// Change password (self only)
router.put('/:id/password', authorizeSelfOrAdmin, validateId, validatePasswordChange, userController.changePassword);

// Admin only routes
router.put('/:id/role', authorize('admin'), validateId, userController.updateUserRole);
router.put('/:id/deactivate', authorize('admin'), validateId, userController.deactivateUser);
router.put('/:id/activate', authorize('admin'), validateId, userController.activateUser);

module.exports = router;
