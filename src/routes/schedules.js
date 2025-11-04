const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { filterByFacility } = require('../middleware/facilityFilter');
const { validateId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Apply facility filtering for users with facilityId
router.use(filterByFacility);

// Schedule CRUD (Admin, Supervisor, Doctor, Caregiver)
router.get('/', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validatePagination, scheduleController.getAllSchedules);
router.get('/calendar', authorize('admin', 'supervisor', 'doctor', 'caregiver'), scheduleController.getCalendarSchedules);
router.get('/:id', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validateId, scheduleController.getScheduleById);
router.post('/', authorize('admin', 'supervisor', 'doctor'), scheduleController.createSchedule);
router.put('/:id', authorize('admin', 'supervisor', 'doctor'), validateId, scheduleController.updateSchedule);
router.delete('/:id', authorize('admin', 'supervisor'), validateId, scheduleController.deleteSchedule);

module.exports = router;




