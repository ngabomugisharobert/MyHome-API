const express = require('express');
const router = express.Router();
const facilityController = require('../controllers/facilityControllerSimple');
const { authenticateToken, authorize } = require('../middleware/auth');
const { filterByFacility, checkFacilityAccess } = require('../middleware/facilityFilter');
const { validateFacility, validateId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Apply facility filtering for users with facilityId
router.use(filterByFacility);

// Get all facilities (Admin and Supervisor only)
router.get('/', authorize('admin', 'supervisor'), validatePagination, facilityController.getAllFacilities);

// Get facility by ID (Admin and Supervisor only)
router.get('/:id', authorize('admin', 'supervisor'), validateId, facilityController.getFacilityById);

// Get facility overview/dashboard (Admin, Supervisor, and Facility Owner)
router.get('/:id/overview', authorize('admin', 'supervisor', 'facility_owner'), validateId, facilityController.getFacilityOverview);

// Create facility (Admin only)
router.post('/', authorize('admin'), validateFacility, facilityController.createFacility);

// Create facility with owner (Admin only)
router.post('/with-owner', authorize('admin'), facilityController.createFacilityWithOwner);

// Get available users for facility assignment (Admin only)
router.get('/available-users', authorize('admin'), facilityController.getAvailableUsers);

// Update facility (Admin only)
router.put('/:id', authorize('admin'), validateId, validateFacility, facilityController.updateFacility);

// Assign owner to facility (Admin only)
router.put('/:id/assign-owner', authorize('admin'), validateId, facilityController.assignOwner);

// Update facility status (Admin only)
router.put('/:id/status', authorize('admin'), validateId, facilityController.updateFacilityStatus);

// Delete facility (Admin only)
router.delete('/:id', authorize('admin'), validateId, facilityController.deleteFacility);

module.exports = router;
