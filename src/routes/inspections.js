const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspectionController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { filterByFacility, checkFacilityAccess } = require('../middleware/facilityFilter');
const { validateId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Apply facility filtering for users with facilityId
router.use(filterByFacility);

// Get all inspections (Admin, Supervisor)
router.get('/', authorize('admin', 'supervisor'), validatePagination, inspectionController.getAllInspections);

// Get inspection statistics (Admin, Supervisor)
router.get('/stats', authorize('admin', 'supervisor'), inspectionController.getInspectionStats);

// Get upcoming inspections (Admin, Supervisor)
router.get('/upcoming', authorize('admin', 'supervisor'), inspectionController.getUpcomingInspections);

// Get inspection by ID (Admin, Supervisor)
router.get('/:id', authorize('admin', 'supervisor'), validateId, inspectionController.getInspectionById);

// Create inspection (Admin, Supervisor)
router.post('/', authorize('admin', 'supervisor'), inspectionController.createInspection);

// Update inspection (Admin, Supervisor)
router.put('/:id', authorize('admin', 'supervisor'), validateId, inspectionController.updateInspection);

// Delete inspection (Admin only)
router.delete('/:id', authorize('admin'), validateId, inspectionController.deleteInspection);

module.exports = router;



