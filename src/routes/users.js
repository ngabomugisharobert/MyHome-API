const express = require('express');
const router = express.Router();
const userController = require('../controllers/userControllerSimple');
const { authenticateToken, authorize, authorizeSelfOrAdmin } = require('../middleware/auth');
const { filterByFacility, checkFacilityAccess } = require('../middleware/facilityFilter');
const { 
  validateUserUpdate, 
  validatePasswordChange, 
  validateId, 
  validatePagination 
} = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Apply facility filtering for users with facilityId
router.use(filterByFacility);

// Get all users (admin only)
router.get('/', authorize('admin'), validatePagination, userController.getAllUsers);

// Get users by facility (admin only)
router.get('/facility/:facilityId', authorize('admin'), userController.getUsersByFacilityDetailed);

// Create user for facility (admin only)
router.post('/for-facility', authorize('admin'), userController.createUserForFacility);

// Assign user to facility (admin only)
router.post('/assign-facility', authorize('admin'), userController.assignUserToFacility);

// Remove user from facility (admin only)
router.delete('/:userId/facility', authorize('admin'), userController.removeUserFromFacility);

// Get user by ID (admin or self)
router.get('/:id', authorizeSelfOrAdmin, validateId, userController.getUserById);

// Update user (admin or self)
router.put('/:id', authorizeSelfOrAdmin, validateId, userController.updateUser);

// Delete user (admin only)
router.delete('/:id', authorize('admin'), validateId, userController.deleteUser);

module.exports = router;
