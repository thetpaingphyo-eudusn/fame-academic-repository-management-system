const { body } = require('express-validator');

// Login validation rules
const loginValidation = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Register validation (for students)
const registerValidation = [
    body('name')
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .trim(),
    
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    
    body('studentId')
        .notEmpty().withMessage('Student ID is required')
        .isLength({ min: 5, max: 20 }).withMessage('Student ID must be between 5 and 20 characters'),
    
    body('department')
        .notEmpty().withMessage('Department is required')
        .isIn(['CS', 'IT', 'CT', 'EC']).withMessage('Invalid department'),
    
    body('year')
        .notEmpty().withMessage('Year is required')
        .isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5'),
    
    body('section')
        .notEmpty().withMessage('Section is required')
        .isIn(['A', 'B', 'C', 'D']).withMessage('Invalid section')
];

// Change password validation
const changePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),
    
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

// Forgot password validation
const forgotPasswordValidation = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
];

// Reset password validation
const resetPasswordValidation = [
    body('token')
        .notEmpty().withMessage('Token is required'),
    
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

module.exports = {
    loginValidation,
    registerValidation,
    changePasswordValidation,
    forgotPasswordValidation,
    resetPasswordValidation
};