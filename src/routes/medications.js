const express = require('express');
const router = express.Router();
const medicationController = require('../controllers/medicationController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { filterByFacility } = require('../middleware/facilityFilter');
const { validateId, validatePagination, validateUUIDParam } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Apply facility filtering for users with facilityId
router.use(filterByFacility);

// Medication CRUD (Admin, Supervisor, Doctor)
router.get('/', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validatePagination, medicationController.getAllMedications);
router.post('/', authorize('admin', 'supervisor', 'doctor'), medicationController.createMedication);

// Medication schedules for residents
router.get('/schedules/resident/:residentId', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validateUUIDParam('residentId'), medicationController.getResidentMedicationSchedules);
router.post('/schedules', authorize('admin', 'supervisor', 'doctor'), medicationController.createMedicationSchedule);
router.put('/schedules/:id', authorize('admin', 'supervisor', 'doctor'), validateId, medicationController.updateMedicationSchedule);

// Medication administration (MAR - Medication Administration Record)
router.post('/administrations/schedule/:scheduleId', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validateUUIDParam('scheduleId'), medicationController.recordMedicationAdministration);
router.get('/administrations', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validatePagination, medicationController.getMedicationAdministrations);

// Medication statistics
router.get('/stats', authorize('admin', 'supervisor', 'doctor'), medicationController.getMedicationStats);

// Medication CRUD routes that rely on :id should come last to avoid conflicts
router.get('/:id', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validateId, medicationController.getMedicationById);
router.put('/:id', authorize('admin', 'supervisor', 'doctor'), validateId, medicationController.updateMedication);
router.delete('/:id', authorize('admin'), validateId, medicationController.deleteMedication);

module.exports = router;

