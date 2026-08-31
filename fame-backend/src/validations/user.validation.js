const { body, param, query } = require('express-validator');

// Create student validation (for Admin/Teacher)
const createStudentValidation = [
    body('name')
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .trim(),
    
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    
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
        .isIn(['A', 'B', 'C', 'D']).withMessage('Invalid section'),
    
    body('password')
        .optional()
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Create teacher validation (for Admin)
const createTeacherValidation = [
    body('name')
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .trim(),
    
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    
    body('teacherId')
        .notEmpty().withMessage('Teacher ID is required')
        .isLength({ min: 5, max: 20 }).withMessage('Teacher ID must be between 5 and 20 characters'),
    
    body('department')
        .notEmpty().withMessage('Department is required')
        .isLength({ min: 2, max: 12 }).withMessage('Department code must be 2–12 characters')
        .matches(/^[A-Za-z0-9]+$/).withMessage('Department code may contain letters and numbers only')
        .customSanitizer((v) => String(v || '').trim().toUpperCase()),
    
    body('password')
        .optional()
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Update user validation
const updateUserValidation = [
    param('id')
        .isMongoId().withMessage('Invalid user ID'),
    
    body('name')
        .optional()
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .trim(),
    
    body('email')
        .optional()
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    
    body('department')
        .optional()
        .isLength({ min: 2, max: 12 }).withMessage('Department code must be 2–12 characters')
        .matches(/^[A-Za-z0-9]+$/).withMessage('Department code may contain letters and numbers only')
        .customSanitizer((v) => String(v || '').trim().toUpperCase()),
    
    body('year')
        .optional()
        .isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5'),
    
    body('section')
        .optional()
        .isIn(['A', 'B', 'C', 'D']).withMessage('Invalid section'),
    
    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be boolean')
];

// User ID validation
const userIdValidation = [
    param('id')
        .notEmpty().withMessage('User ID is required')
        .isMongoId().withMessage('Invalid user ID format')
];

// Get users by role validation
const getUsersByRoleValidation = [
    param('role')
        .notEmpty().withMessage('Role is required')
        .isIn(['student', 'teacher', 'admin']).withMessage('Invalid role')
];

// Get students by department validation
const getStudentsByDeptValidation = [
    param('department')
        .notEmpty().withMessage('Department is required')
        .isLength({ min: 2, max: 12 }).withMessage('Department code must be 2–12 characters')
        .matches(/^[A-Za-z0-9]+$/).withMessage('Department code may contain letters and numbers only')
        .customSanitizer((v) => String(v || '').trim().toUpperCase()),
    
    query('year')
        .optional()
        .isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5'),
    
    query('section')
        .optional()
        .isIn(['A', 'B', 'C', 'D']).withMessage('Invalid section')
];

// Search users validation
const searchUsersValidation = [
    query('keyword')
        .notEmpty().withMessage('Search keyword is required')
        .isLength({ min: 1 }).withMessage('Keyword must be at least 1 character'),
    
    query('role')
        .optional()
        .isIn(['student', 'teacher', 'admin']).withMessage('Invalid role'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
        .toInt()
];

// Reset user password validation (Admin)
const resetPasswordValidation = [
    param('id')
        .isMongoId().withMessage('Invalid user ID'),
    
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Assign teacher to course validation
const assignTeacherValidation = [
    body('teacherId')
        .notEmpty().withMessage('Teacher ID is required')
        .isMongoId().withMessage('Invalid teacher ID'),
    
    body('courseId')
        .notEmpty().withMessage('Course ID is required')
        .isMongoId().withMessage('Invalid course ID')
];

// Bulk create students validation
const bulkCreateStudentsValidation = [
    body('students')
        .isArray({ min: 1 }).withMessage('Students must be a non-empty array'),
    
    body('students.*.name')
        .notEmpty().withMessage('Each student must have a name'),
    
    body('students.*.email')
        .notEmpty().withMessage('Each student must have an email')
        .isEmail().withMessage('Invalid email format'),
    
    body('students.*.studentId')
        .notEmpty().withMessage('Each student must have a student ID'),
    
    body('students.*.department')
        .notEmpty().withMessage('Each student must have a department')
        .isLength({ min: 2, max: 12 }).withMessage('Department code must be 2–12 characters')
        .matches(/^[A-Za-z0-9]+$/).withMessage('Department code may contain letters and numbers only')
        .customSanitizer((v) => String(v || '').trim().toUpperCase()),
    
    body('students.*.year')
        .notEmpty().withMessage('Each student must have a year')
        .isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5'),
    
    body('students.*.section')
        .notEmpty().withMessage('Each student must have a section')
        .isIn(['A', 'B', 'C', 'D']).withMessage('Invalid section')
];

module.exports = {
    createStudentValidation,
    createTeacherValidation,
    updateUserValidation,
    userIdValidation,
    getUsersByRoleValidation,
    getStudentsByDeptValidation,
    searchUsersValidation,
    resetPasswordValidation,
    assignTeacherValidation,
    bulkCreateStudentsValidation
};