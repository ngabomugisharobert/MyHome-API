const express = require('express');
const router = express.Router();
const facilityAccessController = require('../controllers/facilityAccessController');
const { authenticateToken, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get facilities accessible to a user based on their role
router.get('/user/:userId/facilities', authorize('admin', 'supervisor', 'doctor', 'caregiver'), facilityAccessController.getUserAccessibleFacilities);

// Get facilities available to a doctor (for selection)
router.get('/doctor/:userId/facilities', authorize('doctor'), facilityAccessController.getDoctorFacilities);

// Get facilities owned by a user (for owners/supervisors)
router.get('/owner/:userId/facilities', authorize('supervisor'), facilityAccessController.getOwnerFacilities);

// Set doctor's selected facility for data access
router.put('/doctor/:userId/facility', authorize('doctor'), facilityAccessController.setDoctorFacility);

module.exports = router;



