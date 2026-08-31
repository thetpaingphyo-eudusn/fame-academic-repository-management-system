const { body, param, query } = require('express-validator');

// Create project validation
const createProjectValidation = [
    body('title')
        .notEmpty().withMessage('Project title is required')
        .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters')
        .trim(),
    
    body('description')
        .notEmpty().withMessage('Project description is required')
        .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters')
        .trim(),
    
    body('courseId')
        .notEmpty().withMessage('Course ID is required')
        .isMongoId().withMessage('Invalid course ID format'),
    
    body('department')
        .notEmpty().withMessage('Department is required')
        .isIn(['CS', 'IT', 'CT', 'EC']).withMessage('Invalid department'),
    
    body('year')
        .notEmpty().withMessage('Year is required')
        .isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5'),
    
    body('section')
        .notEmpty().withMessage('Section is required')
        .isIn(['A', 'B', 'C', 'D']).withMessage('Invalid section'),
    
    body('semester')
        .optional()
        .isIn(['1st', '2nd']).withMessage('Semester must be 1st or 2nd')
];

// Update project validation
const updateProjectValidation = [
    param('id')
        .isMongoId().withMessage('Invalid project ID'),
    
    body('title')
        .optional()
        .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters')
        .trim(),
    
    body('description')
        .optional()
        .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters')
        .trim(),
    
    body('status')
        .optional()
        .isIn(['pending', 'approved', 'rejected', 'revision', 'archived'])
        .withMessage('Invalid status')
];

// Project ID validation
const projectIdValidation = [
    param('id')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Invalid project ID format')
];

// Version ID validation
const versionIdValidation = [
    param('versionId')
        .notEmpty().withMessage('Version ID is required')
        .isMongoId().withMessage('Invalid version ID format')
];

// Upload project validation
const uploadProjectValidation = [
    body('projectId')
        .optional()
        .isMongoId().withMessage('Invalid project ID'),
    
    body('title')
        .notEmpty().withMessage('Project title is required')
        .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    
    body('description')
        .notEmpty().withMessage('Project description is required')
        .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
    
    body('courseId')
        .notEmpty().withMessage('Course ID is required')
        .isMongoId().withMessage('Invalid course ID')
];

// Search projects validation
const searchProjectsValidation = [
    query('keyword')
        .optional()
        .isLength({ min: 1 }).withMessage('Search keyword must be at least 1 character')
        .trim(),
    
    query('department')
        .optional()
        .isLength({ min: 2, max: 12 }).withMessage('Department code must be 2–12 characters')
        .matches(/^[A-Za-z0-9]+$/).withMessage('Department code may contain letters and numbers only')
        .customSanitizer((v) => String(v || '').trim().toUpperCase()),
    
    query('year')
        .optional()
        .isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5'),
    
    query('section')
        .optional()
        .isIn(['A', 'B', 'C', 'D']).withMessage('Invalid section'),
    
    query('status')
        .optional()
        .isIn(['pending', 'approved', 'rejected', 'revision', 'graded'])
        .withMessage('Invalid status'),
    
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
        .toInt()
];

// Grade project validation — grade is computed from criterionScores on the server
const gradeProjectValidation = [
    param('id')
        .isMongoId().withMessage('Invalid project ID'),
    
    body('feedback')
        .notEmpty().withMessage('Feedback is required')
        .isLength({ min: 5, max: 2000 }).withMessage('Feedback must be between 5 and 2000 characters'),
    
    body('criterionScores')
        .isArray({ min: 1 }).withMessage('Scores for all grading criteria are required'),
    
    body('criterionScores.*.name')
        .notEmpty().withMessage('Each criterion must have a name'),
    
    body('criterionScores.*.score')
        .notEmpty().withMessage('Each criterion must have a score')
        .isFloat({ min: 0, max: 100 }).withMessage('Criterion scores must be between 0 and 100')
];

// Approve/reject project validation
const approveRejectValidation = [
    param('id')
        .isMongoId().withMessage('Invalid project ID'),
    
    body('notes')
        .optional()
        .isLength({ max: 500 }).withMessage('Notes must be less than 500 characters')
];

// Request revision validation
const revisionValidation = [
    param('id')
        .isMongoId().withMessage('Invalid project ID'),
    
    body('revisionNotes')
        .notEmpty().withMessage('Revision notes are required')
        .isLength({ min: 10, max: 1000 }).withMessage('Revision notes must be between 10 and 1000 characters')
];

// Compare versions validation
const compareVersionsValidation = [
    param('projectId')
        .isMongoId().withMessage('Invalid project ID'),
    
    body('versionA')
        .notEmpty().withMessage('Version A is required')
        .isInt({ min: 1 }).withMessage('Version must be a positive integer'),
    
    body('versionB')
        .notEmpty().withMessage('Version B is required')
        .isInt({ min: 1 }).withMessage('Version must be a positive integer')
        .custom((value, { req }) => {
            if (value === req.body.versionA) {
                throw new Error('Versions must be different');
            }
            return true;
        })
];

module.exports = {
    createProjectValidation,
    updateProjectValidation,
    projectIdValidation,
    versionIdValidation,
    uploadProjectValidation,
    searchProjectsValidation,
    gradeProjectValidation,
    approveRejectValidation,
    revisionValidation,
    compareVersionsValidation
};