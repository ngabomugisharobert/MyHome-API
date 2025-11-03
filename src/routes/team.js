const express = require('express');
const router = express.Router();
const {
  getTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getTeamReports
} = require('../controllers/teamController');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Get all team members (Admin, Supervisor)
router.get('/', authorize('admin', 'supervisor'), getTeamMembers);

// Get team member by ID (Admin, Supervisor)
router.get('/:id', authorize('admin', 'supervisor'), getTeamMemberById);

// Create new team member (Admin, Supervisor)
router.post('/', authorize('admin', 'supervisor'), createTeamMember);

// Update team member (Admin, Supervisor)
router.put('/:id', authorize('admin', 'supervisor'), updateTeamMember);

// Delete team member (Admin, Supervisor)
router.delete('/:id', authorize('admin', 'supervisor'), deleteTeamMember);

// Get team reports (Admin, Supervisor)
router.get('/reports/analytics', authorize('admin', 'supervisor'), getTeamReports);

module.exports = router;
