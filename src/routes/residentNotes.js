const express = require('express');
const router = express.Router();
const noteController = require('../controllers/residentNoteController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Get all notes for a resident (Admin, Supervisor, Doctor, Caregiver)
router.get('/resident/:residentId', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validatePagination, noteController.getAllNotes);

// Get note by ID (Admin, Supervisor, Doctor, Caregiver)
router.get('/:id', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validateId, noteController.getNoteById);

// Create note (Admin, Supervisor, Doctor, Caregiver)
router.post('/resident/:residentId', authorize('admin', 'supervisor', 'doctor', 'caregiver'), noteController.createNote);

// Update note (Admin, Supervisor, Doctor, Caregiver - creator only)
router.put('/:id', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validateId, noteController.updateNote);

// Delete note (Admin, Supervisor, Doctor, Caregiver - creator or admin only)
router.delete('/:id', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validateId, noteController.deleteNote);

module.exports = router;


