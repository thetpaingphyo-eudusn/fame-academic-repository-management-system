const express = require('express');
const router = express.Router();
const TeacherController = require('../controllers/teacher.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');
const { projectIdValidation, gradeProjectValidation, revisionValidation } = require('../validations/project.validation');

// ✅ Allow both teacher AND admin to access these routes
router.use(protect);
router.use(authorize('teacher', 'admin'));

// ==================== PROJECT MANAGEMENT ====================
router.get('/projects', TeacherController.getMyProjects);
router.get('/projects/:id', projectIdValidation, validate, TeacherController.getProjectById);
router.get('/projects/:id/health', projectIdValidation, validate, TeacherController.getProjectHealth);

// ==================== GRADING & FEEDBACK ====================
router.post('/projects/:id/grade', projectIdValidation, gradeProjectValidation, validate, TeacherController.gradeProject);
router.put('/projects/:id/approve', projectIdValidation, validate, TeacherController.approveProject);
router.put('/projects/:id/reject', projectIdValidation, validate, TeacherController.rejectProject);
router.put('/projects/:id/revision', projectIdValidation, revisionValidation, validate, TeacherController.requestRevision);

// ==================== FEEDBACK MANAGEMENT ====================
router.get('/feedback', TeacherController.getMyFeedback);
router.put('/feedback/:id', TeacherController.updateFeedback);

// ==================== COURSE MANAGEMENT ====================
router.get('/courses', TeacherController.getMyCourses);
router.post('/courses', TeacherController.createCourse);
router.get('/courses/:id', TeacherController.getCourseById);
router.put('/courses/:id', TeacherController.updateCourse);
router.delete('/courses/:id', TeacherController.deleteCourse);
router.get('/courses/:courseId/students', TeacherController.getStudentsByCourse);

// ==================== ASSIGNMENT MANAGEMENT ====================
// ✅ ADD THESE MISSING ROUTES
router.get('/assignments', TeacherController.getMyAssignments);  // Get all assignments for teacher
router.get('/courses/:courseId/assignments', TeacherController.getAssignmentsByCourse);
router.get('/assignments/:id', TeacherController.getAssignmentById);
router.post('/assignments', TeacherController.createAssignment);
router.put('/assignments/:id', TeacherController.updateAssignment);
router.delete('/assignments/:id', TeacherController.deleteAssignment);
router.get('/assignments/:assignmentId/submissions', TeacherController.getSubmissionsByAssignment);

// ==================== GRADING CRITERIA ====================
router.get('/assignments/:assignmentId/criteria', TeacherController.getGradingCriteria);
router.put('/assignments/:assignmentId/criteria', TeacherController.updateGradingCriteria);

// ==================== SUBMISSION GRADING ====================
router.post('/submissions/:id/grade', TeacherController.gradeSubmission);
router.put('/submissions/:id/approve', TeacherController.approveSubmission);
router.put('/submissions/:id/revision', TeacherController.requestRevisionSubmission);

// ==================== DEPENDENCY & HEALTH CHECK ====================
router.get('/projects/:id/dependencies', TeacherController.getProjectDependencies);
router.post('/projects/:id/analyze-dependencies', TeacherController.analyzeProjectDependencies);
router.post('/projects/:id/health-check', TeacherController.runHealthCheck);

// ==================== STUDENT ENROLLMENT (teachers enroll existing admin-created students) ====================
router.get('/students/available', TeacherController.searchStudentsForEnrollment);
router.get('/students', TeacherController.getAllStudents);
router.get('/students/:id', TeacherController.getStudentById);
router.put('/students/:id', TeacherController.updateStudent);
router.delete('/students/:id', TeacherController.deleteStudent);
router.post('/courses/:courseId/students/:studentId/assign', TeacherController.assignStudentToCourse);

// ==================== NOTIFICATIONS ====================
router.post('/notifications/send', TeacherController.sendNotificationToStudents);

module.exports = router;