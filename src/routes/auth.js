const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllerSimple');
const { authenticateToken, authorize } = require('../middleware/auth');
const { 
  validateUserRegistration, 
  validateUserLogin, 
  validateForgotPassword, 
  validateResetPassword 
} = require('../middleware/validation');

// Public routes
router.post('/register', authorize('admin'), validateUserRegistration, authController.register);
router.post('/login', validateUserLogin, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes (require authentication)
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;
