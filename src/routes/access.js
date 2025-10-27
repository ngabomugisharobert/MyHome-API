const express = require('express');
const router = express.Router();
const {
  getAccessRules,
  getAccessRuleById,
  createAccessRule,
  updateAccessRule,
  deleteAccessRule,
  getAvailablePermissions
} = require('../controllers/accessController');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Get all access rules (Admin, Supervisor)
router.get('/', authorize('admin', 'supervisor'), getAccessRules);

// Get access rule by ID (Admin, Supervisor)
router.get('/:id', authorize('admin', 'supervisor'), getAccessRuleById);

// Create new access rule (Admin, Supervisor)
router.post('/', authorize('admin', 'supervisor'), createAccessRule);

// Update access rule (Admin, Supervisor)
router.put('/:id', authorize('admin', 'supervisor'), updateAccessRule);

// Delete access rule (Admin, Supervisor)
router.delete('/:id', authorize('admin', 'supervisor'), deleteAccessRule);

// Get available permissions (Admin, Supervisor)
router.get('/permissions/available', authorize('admin', 'supervisor'), getAvailablePermissions);

module.exports = router;
