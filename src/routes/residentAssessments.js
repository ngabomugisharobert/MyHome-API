const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/residentAssessmentController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Get all assessments for a resident (Admin, Supervisor, Doctor)
router.get('/resident/:residentId', authorize('admin', 'supervisor', 'doctor'), validatePagination, assessmentController.getAllAssessments);

// Get assessment by ID (Admin, Supervisor, Doctor)
router.get('/:id', authorize('admin', 'supervisor', 'doctor'), validateId, assessmentController.getAssessmentById);

// Create assessment (Admin, Supervisor, Doctor)
router.post('/resident/:residentId', authorize('admin', 'supervisor', 'doctor'), assessmentController.createAssessment);

// Update assessment (Admin, Supervisor, Doctor)
router.put('/:id', authorize('admin', 'supervisor', 'doctor'), validateId, assessmentController.updateAssessment);

// Delete assessment (Admin, Supervisor)
router.delete('/:id', authorize('admin', 'supervisor'), validateId, assessmentController.deleteAssessment);

module.exports = router;


