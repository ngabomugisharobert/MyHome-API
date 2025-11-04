const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { filterByFacility, checkFacilityAccess } = require('../middleware/facilityFilter');
const { validateId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Apply facility filtering for users with facilityId
router.use(filterByFacility);

// Get all contacts (Admin, Supervisor)
router.get('/', authorize('admin', 'supervisor'), validatePagination, contactController.getAllContacts);

// Get contacts for a specific resident (Admin, Supervisor, Doctor, Caregiver)
// IMPORTANT: This route must come before /:id to avoid route conflicts
router.get('/resident/:residentId', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validatePagination, contactController.getResidentContacts);

// Get emergency contacts (Admin, Supervisor, Doctor, Caregiver)
router.get('/emergency', authorize('admin', 'supervisor', 'doctor', 'caregiver'), contactController.getEmergencyContacts);

// Get contact by ID (Admin, Supervisor)
router.get('/:id', authorize('admin', 'supervisor'), validateId, contactController.getContactById);

// Create contact (Admin, Supervisor)
router.post('/', authorize('admin', 'supervisor'), contactController.createContact);

// Update contact (Admin, Supervisor)
router.put('/:id', authorize('admin', 'supervisor'), validateId, contactController.updateContact);

// Delete contact (Admin, Supervisor)
router.delete('/:id', authorize('admin', 'supervisor'), validateId, contactController.deleteContact);

module.exports = router;



