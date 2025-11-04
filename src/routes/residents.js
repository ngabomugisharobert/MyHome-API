const express = require('express');
const router = express.Router();
const residentController = require('../controllers/residentController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { filterByFacility, checkFacilityAccess } = require('../middleware/facilityFilter');
const { validateId, validatePagination, validateResident } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Apply facility filtering for users with facilityId
router.use(filterByFacility);

// Get all residents (Admin, Supervisor, Doctor, Caregiver)
router.get('/', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validatePagination, residentController.getAllResidents);

// Get residents statistics (Admin, Supervisor)
router.get('/stats', authorize('admin', 'supervisor'), residentController.getResidentsStats);

// Get available physicians (Admin, Supervisor, Doctor)
// IMPORTANT: This route must come before /:id to avoid route conflicts
router.get('/physicians', authorize('admin', 'supervisor', 'doctor'), residentController.getAvailablePhysicians);

// Get resident by ID (Admin, Supervisor, Doctor, Caregiver)
router.get('/:id', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validateId, residentController.getResidentById);

// Create resident (Admin, Supervisor)
router.post('/', authorize('admin', 'supervisor'), validateResident, residentController.createResident);

// Update resident (Admin, Supervisor, Doctor)
router.put('/:id', authorize('admin', 'supervisor', 'doctor'), validateId, residentController.updateResident);

// Delete resident (Admin only)
router.delete('/:id', authorize('admin'), validateId, residentController.deleteResident);

module.exports = router;



