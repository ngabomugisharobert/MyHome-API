const express = require('express');
const router = express.Router();
const formController = require('../controllers/residentFormController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Get all forms for a resident (Admin, Supervisor, Doctor)
router.get('/resident/:residentId', authorize('admin', 'supervisor', 'doctor'), validatePagination, formController.getAllForms);

// Get form by ID (Admin, Supervisor, Doctor)
router.get('/:id', authorize('admin', 'supervisor', 'doctor'), validateId, formController.getFormById);

// Create form (Admin, Supervisor, Doctor)
router.post('/resident/:residentId', authorize('admin', 'supervisor', 'doctor'), formController.createForm);

// Update form (Admin, Supervisor, Doctor)
router.put('/:id', authorize('admin', 'supervisor', 'doctor'), validateId, formController.updateForm);

// Sign form (Admin, Supervisor, Doctor)
router.post('/:id/sign', authorize('admin', 'supervisor', 'doctor'), validateId, formController.signForm);

// Delete form (Admin, Supervisor)
router.delete('/:id', authorize('admin', 'supervisor'), validateId, formController.deleteForm);

module.exports = router;


