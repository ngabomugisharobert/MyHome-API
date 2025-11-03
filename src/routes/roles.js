const express = require('express');
const router = express.Router();
const {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getPermissions
} = require('../controllers/roleController');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Get all roles (Admin only)
router.get('/', authorize('admin'), getRoles);

// Get role by ID (Admin only)
router.get('/:id', authorize('admin'), getRoleById);

// Create new role (Admin only)
router.post('/', authorize('admin'), createRole);

// Update role (Admin only)
router.put('/:id', authorize('admin'), updateRole);

// Delete role (Admin only)
router.delete('/:id', authorize('admin'), deleteRole);

// Get available permissions (Admin only)
router.get('/permissions/available', authorize('admin'), getPermissions);

module.exports = router;
