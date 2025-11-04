const express = require('express');
const router = express.Router();
const reportController = require('../controllers/residentReportController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Get all reports for a resident (Admin, Supervisor, Doctor)
router.get('/resident/:residentId', authorize('admin', 'supervisor', 'doctor'), validatePagination, reportController.getAllReports);

// Get report by ID (Admin, Supervisor, Doctor)
router.get('/:id', authorize('admin', 'supervisor', 'doctor'), validateId, reportController.getReportById);

// Create report (Admin, Supervisor, Doctor)
router.post('/resident/:residentId', authorize('admin', 'supervisor', 'doctor'), reportController.createReport);

// Update report (Admin, Supervisor, Doctor)
router.put('/:id', authorize('admin', 'supervisor', 'doctor'), validateId, reportController.updateReport);

// Delete report (Admin, Supervisor)
router.delete('/:id', authorize('admin', 'supervisor'), validateId, reportController.deleteReport);

module.exports = router;


