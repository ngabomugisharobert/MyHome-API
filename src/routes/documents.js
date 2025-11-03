const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { filterByFacility, checkFacilityAccess } = require('../middleware/facilityFilter');
const { validateId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Apply facility filtering for users with facilityId
router.use(filterByFacility);

// Get all documents (Admin, Supervisor)
router.get('/', authorize('admin', 'supervisor'), validatePagination, documentController.getAllDocuments);

// Get documents by category (Admin, Supervisor)
router.get('/category/:category', authorize('admin', 'supervisor'), documentController.getDocumentsByCategory);

// Get expiring documents (Admin, Supervisor)
router.get('/expiring', authorize('admin', 'supervisor'), documentController.getExpiringDocuments);

// Get document by ID (Admin, Supervisor)
router.get('/:id', authorize('admin', 'supervisor'), validateId, documentController.getDocumentById);

// Create document (Admin, Supervisor)
router.post('/', authorize('admin', 'supervisor'), documentController.createDocument);

// Update document (Admin, Supervisor)
router.put('/:id', authorize('admin', 'supervisor'), validateId, documentController.updateDocument);

// Delete document (Admin, Supervisor)
router.delete('/:id', authorize('admin', 'supervisor'), validateId, documentController.deleteDocument);

module.exports = router;



