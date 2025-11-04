const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { filterByFacility, checkFacilityAccess } = require('../middleware/facilityFilter');
const { validateId, validatePagination } = require('../middleware/validation');
const { handleUpload } = require('../middleware/upload');

// All routes require authentication
router.use(authenticateToken);

// Apply facility filtering for users with facilityId
router.use(filterByFacility);

// Get all documents (Admin, Supervisor)
router.get('/', authorize('admin', 'supervisor'), validatePagination, documentController.getAllDocuments);

// Get documents for a specific resident (Admin, Supervisor, Doctor, Caregiver)
// IMPORTANT: This route must come before /:id to avoid route conflicts
// Note: validatePagination is optional for resident documents, so we handle pagination in the controller
router.get('/resident/:residentId', authorize('admin', 'supervisor', 'doctor', 'caregiver'), documentController.getResidentDocuments);

// Get documents by category (Admin, Supervisor)
router.get('/category/:category', authorize('admin', 'supervisor'), documentController.getDocumentsByCategory);

// Get expiring documents (Admin, Supervisor)
router.get('/expiring', authorize('admin', 'supervisor'), documentController.getExpiringDocuments);

// Download document file (Admin, Supervisor, Doctor, Caregiver)
router.get('/:id/download', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validateId, documentController.downloadDocument);

// Get document by ID (Admin, Supervisor)
router.get('/:id', authorize('admin', 'supervisor'), validateId, documentController.getDocumentById);

// Create document (Admin, Supervisor) - with file upload
router.post('/', authorize('admin', 'supervisor'), handleUpload, documentController.createDocument);

// Update document (Admin, Supervisor)
router.put('/:id', authorize('admin', 'supervisor'), validateId, documentController.updateDocument);

// Delete document (Admin, Supervisor)
router.delete('/:id', authorize('admin', 'supervisor'), validateId, documentController.deleteDocument);

module.exports = router;



