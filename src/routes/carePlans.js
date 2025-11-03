const express = require('express');
const router = express.Router();
const carePlanController = require('../controllers/carePlanController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { filterByFacility } = require('../middleware/facilityFilter');
const { validateId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Apply facility filtering for users with facilityId
router.use(filterByFacility);

// Care Plan CRUD (Admin, Supervisor, Doctor)
router.get('/', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validatePagination, carePlanController.getAllCarePlans);
router.get('/:id', authorize('admin', 'supervisor', 'doctor', 'caregiver'), validateId, carePlanController.getCarePlanById);
router.post('/', authorize('admin', 'supervisor', 'doctor'), carePlanController.createCarePlan);
router.put('/:id', authorize('admin', 'supervisor', 'doctor'), validateId, carePlanController.updateCarePlan);
router.delete('/:id', authorize('admin', 'supervisor'), validateId, carePlanController.deleteCarePlan);

// Care Plan Goals
router.post('/:carePlanId/goals', authorize('admin', 'supervisor', 'doctor'), validateId, carePlanController.createCarePlanGoal);
router.put('/goals/:id', authorize('admin', 'supervisor', 'doctor'), validateId, carePlanController.updateCarePlanGoal);
router.delete('/goals/:id', authorize('admin', 'supervisor', 'doctor'), validateId, carePlanController.deleteCarePlanGoal);

module.exports = router;



