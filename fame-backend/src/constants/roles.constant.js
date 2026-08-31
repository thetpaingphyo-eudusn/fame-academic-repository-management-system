/**
 * User Roles Constants
 */

const ROLES = {
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STUDENT: 'student'
};

const ROLE_HIERARCHY = {
    [ROLES.ADMIN]: 3,
    [ROLES.TEACHER]: 2,
    [ROLES.STUDENT]: 1
};

const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: [
        'manage_users',
        'manage_departments',
        'manage_courses',
        'manage_all_projects',
        'view_all_reports',
        'configure_system',
        'manage_audit_logs'
    ],
    [ROLES.TEACHER]: [
        'view_assigned_courses',
        'view_student_projects',
        'grade_projects',
        'give_feedback',
        'check_plagiarism',
        'view_department_reports'
    ],
    [ROLES.STUDENT]: [
        'upload_project',
        'view_own_projects',
        'view_own_feedback',
        'update_own_profile',
        'search_own_projects'
    ]
};

const ROLE_DISPLAY_NAMES = {
    [ROLES.ADMIN]: 'Administrator',
    [ROLES.TEACHER]: 'Teacher / Lecturer',
    [ROLES.STUDENT]: 'Student'
};

module.exports = {
    ROLES,
    ROLE_HIERARCHY,
    ROLE_PERMISSIONS,
    ROLE_DISPLAY_NAMES
};