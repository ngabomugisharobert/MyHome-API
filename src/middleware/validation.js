const { body, param, query, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation for healthcare system
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name is required and must be between 2 and 100 characters'),
  body('role')
    .isIn(['admin', 'caregiver', 'doctor', 'supervisor'])
    .withMessage('Role must be one of: admin, caregiver, doctor, supervisor'),
  body('facilityId')
    .optional()
    .isUUID()
    .withMessage('Facility ID must be a valid UUID'),
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// User update validation
const validateUserUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  handleValidationErrors
];

// ID parameter validation (for UUIDs)
const validateId = [
  param('id')
    .isUUID()
    .withMessage('ID must be a valid UUID'),
  handleValidationErrors
];

// Generic UUID parameter validator
const validateUUIDParam = (paramName) => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName.replace(/([A-Z])/g, ' $1')} must be a valid UUID`),
  handleValidationErrors
];

// Password reset validation
const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];

const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  handleValidationErrors
];

// Facility validation
const validateFacility = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Facility name is required and must be between 2 and 255 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('licenseNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('License number must be less than 100 characters'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// Resident validation
const validateResident = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('First name is required and must be less than 255 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Last name is required and must be less than 255 characters'),
  body('dob')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be one of: male, female, other'),
  body('admissionDate')
    .optional()
    .isISO8601()
    .withMessage('Admission date must be a valid date'),
  body('dischargeDate')
    .optional()
    .isISO8601()
    .withMessage('Discharge date must be a valid date'),
  body('primaryPhysician')
    .optional()
    .custom((value) => {
      if (!value) return true; // Allow empty/null
      // Check if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('Primary physician must be a valid UUID. Please select a user from the list or leave it empty.');
      }
      return true;
    }),
  body('facilityId')
    .optional()
    .isUUID()
    .withMessage('Facility ID must be a valid UUID'),
  body('mobilityLevel')
    .optional()
    .isIn(['independent', 'assisted', 'wheelchair', 'bedridden'])
    .withMessage('Mobility level must be one of: independent, assisted, wheelchair, bedridden'),
  body('careLevel')
    .optional()
    .isIn(['independent', 'assisted_living', 'memory_care', 'skilled_nursing', 'hospice'])
    .withMessage('Care level must be one of: independent, assisted_living, memory_care, skilled_nursing, hospice'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'discharged'])
    .withMessage('Status must be one of: active, inactive, discharged'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validatePasswordChange,
  validateForgotPassword,
  validateResetPassword,
  validateFacility,
  validateId,
  validatePagination,
  validateResident,
  validateUUIDParam
};
