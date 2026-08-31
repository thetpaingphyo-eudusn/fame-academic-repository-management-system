/**
 * Project Status Constants
 */

const PROJECT_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    REVISION: 'revision',
    ARCHIVED: 'archived',
    GRADED: 'graded'
};

const PROJECT_STATUS_DISPLAY = {
    [PROJECT_STATUS.PENDING]: 'Pending Review',
    [PROJECT_STATUS.APPROVED]: 'Approved',
    [PROJECT_STATUS.REJECTED]: 'Rejected',
    [PROJECT_STATUS.REVISION]: 'Revision Required',
    [PROJECT_STATUS.ARCHIVED]: 'Archived',
    [PROJECT_STATUS.GRADED]: 'Graded'
};

const PROJECT_STATUS_COLORS = {
    [PROJECT_STATUS.PENDING]: 'yellow',
    [PROJECT_STATUS.APPROVED]: 'green',
    [PROJECT_STATUS.REJECTED]: 'red',
    [PROJECT_STATUS.REVISION]: 'orange',
    [PROJECT_STATUS.ARCHIVED]: 'gray',
    [PROJECT_STATUS.GRADED]: 'blue'
};

// User Account Status
const USER_STATUS = {
    ACTIVE: true,
    INACTIVE: false
};

// Course Status
const COURSE_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    COMPLETED: 'completed'
};

// Department Status
const DEPARTMENT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive'
};

// Semester
const SEMESTER = {
    FIRST: '1st',
    SECOND: '2nd'
};

// Feedback Status
const FEEDBACK_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    REVISION_REQUESTED: 'revision_requested'
};

// Plagiarism Level (for future use)
const PLAGIARISM_LEVEL = {
    NONE: 'none',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};

// Code Health Level
const HEALTH_LEVEL = {
    EXCELLENT: { min: 90, max: 100, label: 'Excellent' },
    GOOD: { min: 70, max: 89, label: 'Good' },
    FAIR: { min: 50, max: 69, label: 'Fair' },
    POOR: { min: 30, max: 49, label: 'Poor' },
    CRITICAL: { min: 0, max: 29, label: 'Critical' }
};

module.exports = {
    PROJECT_STATUS,
    PROJECT_STATUS_DISPLAY,
    PROJECT_STATUS_COLORS,
    USER_STATUS,
    COURSE_STATUS,
    DEPARTMENT_STATUS,
    SEMESTER,
    FEEDBACK_STATUS,
    PLAGIARISM_LEVEL,
    HEALTH_LEVEL
};