/**
 * System Messages Constants
 */

// Success Messages
const SUCCESS_MESSAGES = {
    // Auth
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    PASSWORD_CHANGED: 'Password changed successfully',
    PASSWORD_RESET: 'Password reset successfully',
    
    // User Management
    USER_CREATED: 'User created successfully',
    USER_UPDATED: 'User updated successfully',
    USER_DELETED: 'User deleted successfully',
    USER_ACTIVATED: 'User activated successfully',
    USER_DEACTIVATED: 'User deactivated successfully',
    
    // Project Management
    PROJECT_UPLOADED: 'Project uploaded successfully',
    PROJECT_UPDATED: 'Project updated successfully',
    PROJECT_DELETED: 'Project deleted successfully',
    PROJECT_APPROVED: 'Project approved successfully',
    PROJECT_REJECTED: 'Project rejected successfully',
    REVISION_REQUESTED: 'Revision requested successfully',
    
    // Grading
    GRADE_SAVED: 'Grade saved successfully',
    FEEDBACK_SAVED: 'Feedback saved successfully',
    FEEDBACK_PUBLISHED: 'Feedback published successfully',
    
    // Department & Course
    DEPARTMENT_CREATED: 'Department created successfully',
    COURSE_CREATED: 'Course created successfully',
    TEACHER_ASSIGNED: 'Teacher assigned successfully',
    
    // File Operations
    FILE_UPLOADED: 'File uploaded successfully',
    FILE_DELETED: 'File deleted successfully',
    DOWNLOAD_READY: 'Download ready',
    
    // Search
    SEARCH_COMPLETED: 'Search completed successfully',
    
    // Plagiarism (future)
    PLAGIARISM_CHECKED: 'Plagiarism check completed',
    
    // System
    BACKUP_CREATED: 'Backup created successfully',
    SYSTEM_CONFIGURED: 'System configured successfully'
};

// Error Messages
const ERROR_MESSAGES = {
    // Auth Errors
    UNAUTHORIZED: 'Unauthorized access',
    INVALID_CREDENTIALS: 'Invalid email or password',
    TOKEN_EXPIRED: 'Token expired. Please login again',
    TOKEN_INVALID: 'Invalid token',
    ACCOUNT_DEACTIVATED: 'Your account has been deactivated',
    ACCESS_DENIED: 'Access denied. Insufficient permissions',
    
    // Validation Errors
    VALIDATION_FAILED: 'Validation failed',
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please provide a valid email',
    INVALID_PASSWORD: 'Password must be at least 6 characters',
    INVALID_OBJECT_ID: 'Invalid ID format',
    
    // User Errors
    USER_NOT_FOUND: 'User not found',
    USER_ALREADY_EXISTS: 'User already exists',
    EMAIL_ALREADY_EXISTS: 'Email already registered',
    STUDENT_ID_EXISTS: 'Student ID already exists',
    TEACHER_ID_EXISTS: 'Teacher ID already exists',
    
    // Project Errors
    PROJECT_NOT_FOUND: 'Project not found',
    PROJECT_ALREADY_EXISTS: 'Project already exists',
    NO_FILE_UPLOADED: 'No file uploaded',
    INVALID_FILE_TYPE: 'Invalid file type',
    FILE_TOO_LARGE: 'File size exceeds limit',
    
    // Course & Department Errors
    COURSE_NOT_FOUND: 'Course not found',
    DEPARTMENT_NOT_FOUND: 'Department not found',
    SECTION_NOT_FOUND: 'Section not found',
    TEACHER_NOT_FOUND: 'Teacher not found',
    STUDENT_NOT_FOUND: 'Student not found',
    
    // Grading Errors
    FEEDBACK_NOT_FOUND: 'Feedback not found',
    INVALID_GRADE: 'Grade must be between 0 and 100',
    ALREADY_GRADED: 'This project has already been graded',
    
    // File Errors
    UPLOAD_FAILED: 'File upload failed',
    DOWNLOAD_FAILED: 'Download failed',
    FILE_NOT_FOUND: 'File not found',
    
    // Search Errors
    SEARCH_FAILED: 'Search failed. Please try again',
    
    // Plagiarism Errors
    PLAGIARISM_CHECK_FAILED: 'Plagiarism check failed',
    
    // Database Errors
    DATABASE_ERROR: 'Database error occurred',
    DUPLICATE_ENTRY: 'Duplicate entry found',
    
    // Server Errors
    INTERNAL_SERVER_ERROR: 'Internal server error',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
};

// Info Messages
const INFO_MESSAGES = {
    // Status
    PROJECT_PENDING: 'Your project is pending review',
    PROJECT_REVISION: 'Your project needs revision',
    PROJECT_APPROVED: 'Your project has been approved',
    PROJECT_REJECTED: 'Your project has been rejected',
    PROJECT_GRADED: 'Your project has been graded',
    
    // Notifications
    FEEDBACK_AVAILABLE: 'New feedback available for your project',
    GRADE_PUBLISHED: 'Your grade has been published',
    REVISION_REQUEST: 'Teacher requested revision on your project',
    
    // Upload
    UPLOADING: 'Uploading project files...',
    PROCESSING: 'Processing your project...',
    SCANNING: 'Scanning for dependencies...',
    
    // Search
    NO_RESULTS: 'No results found',
    RESULTS_FOUND: 'results found'
};

// Warning Messages
const WARNING_MESSAGES = {
    DEPRECATED_LIBRARY: 'deprecated library detected',
    SECURITY_VULNERABILITY: 'Security vulnerability found',
    HIGH_PLAGIARISM: 'High similarity detected with another project',
    LOW_HEALTH_SCORE: 'Code health score is low',
    SESSION_EXPIRING: 'Your session will expire soon'
};

module.exports = {
    SUCCESS_MESSAGES,
    ERROR_MESSAGES,
    INFO_MESSAGES,
    WARNING_MESSAGES
};