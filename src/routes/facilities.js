const express = require('express');
const router = express.Router();
const facilityController = require('../controllers/facilityController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateFacility, validateId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Get all facilities (Admin and Supervisor only)
router.get('/', authorize('admin', 'supervisor'), validatePagination, facilityController.getAllFacilities);

// Get facility by ID (Admin and Supervisor only)
router.get('/:id', authorize('admin', 'supervisor'), validateId, facilityController.getFacilityById);

// Create facility (Admin only)
router.post('/', authorize('admin'), validateFacility, facilityController.createFacility);

// Update facility (Admin only)
router.put('/:id', authorize('admin'), validateId, validateFacility, facilityController.updateFacility);

// Deactivate facility (Admin only)
router.put('/:id/deactivate', authorize('admin'), validateId, facilityController.deactivateFacility);

// Activate facility (Admin only)
router.put('/:id/activate', authorize('admin'), validateId, facilityController.activateFacility);

module.exports = router;
