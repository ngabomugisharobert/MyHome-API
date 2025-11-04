const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { filterByFacility, checkFacilityAccess } = require('../middleware/facilityFilter');
const { validateId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Apply facility filtering for users with facilityId
router.use(filterByFacility);

// Get all tasks (Admin, Supervisor, Doctor, Caregiver)
router.get('/', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validatePagination, taskController.getAllTasks);

// Get user's assigned tasks (All roles)
router.get('/my-tasks', taskController.getUserTasks);

// Get overdue tasks (Admin, Supervisor)
router.get('/overdue', authorize('admin', 'supervisor'), taskController.getOverdueTasks);

// Get task statistics (Admin, Supervisor)
router.get('/stats', authorize('admin', 'supervisor'), taskController.getTaskStats);

// Get task by ID (Admin, Supervisor, Doctor, Caregiver)
router.get('/:id', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validateId, taskController.getTaskById);

// Create task (Admin, Supervisor)
router.post('/', authorize('admin', 'supervisor'), taskController.createTask);

// Update task (Admin, Supervisor, Doctor, Caregiver)
router.put('/:id', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validateId, taskController.updateTask);

// Delete task (Admin, Supervisor)
router.delete('/:id', authorize('admin', 'supervisor'), validateId, taskController.deleteTask);

module.exports = router;




