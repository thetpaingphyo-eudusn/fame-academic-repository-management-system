const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const RagController = require('../controllers/rag.controller');
const CourseController = require('../controllers/course.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { uploadProjectFiles } = require('../middleware/upload.middleware');

router.use(protect);
router.use(authorize('admin'));

// User Management
router.get('/users', AdminController.getAllUsers);
router.get('/users/:id', AdminController.getUserById);
router.post('/users/student', AdminController.createStudent);
router.post('/users/teacher', AdminController.createTeacher);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);
router.post('/users/:id/reset-password', AdminController.resetPassword);

// Department Management
router.get('/departments', AdminController.getAllDepartments);
router.post('/departments', AdminController.createDepartment);

// Course Management
router.get('/courses', CourseController.getAllCourses);
router.get('/courses/:id', CourseController.getCourseById);
router.post('/courses', CourseController.createCourse);
router.put('/courses/:id', CourseController.updateCourse);
router.delete('/courses/:id', CourseController.deleteCourse);
router.put('/courses/:id/assign-teacher', CourseController.assignTeacher);

// Project Management
router.get('/projects', AdminController.getAllProjects);
router.delete('/projects/:id', AdminController.deleteProject);
router.post('/projects/:id/upload', uploadProjectFiles, AdminController.uploadProjectFilesForStudent);

// Submissions & Feedbacks (Admin view all)
router.get('/submissions', AdminController.getAllSubmissions);
router.get('/feedbacks', AdminController.getAllFeedbacks);

// Analytics
router.get('/analytics/monthly', AdminController.getMonthlyAnalytics);
router.get('/analytics/departments', AdminController.getDepartmentAnalytics);
router.get('/analytics/status', AdminController.getStatusAnalytics);
router.get('/analytics/top-students', AdminController.getTopStudentsAnalytics);
router.get('/analytics/teacher-performance', AdminController.getTeacherPerformanceAnalytics);
router.get('/analytics/performance', AdminController.getPerformanceAnalytics);

// ==================== BULK STUDENT REGISTRATION ====================
router.post('/users/students/bulk', AdminController.bulkCreateStudents);  // ✅ Bulk import

// Dashboard
router.get('/dashboard/stats', AdminController.getDashboardStats);

// ✅ RAG ROUTES - MAKE SURE THESE EXIST
router.post('/rag/train', AdminController.trainRagData);
router.get('/rag/status', AdminController.getTrainingStatus);
router.get('/rag/test', AdminController.testGemini);
router.get('/rag/chat/sessions', RagController.getChatSessions);
router.get('/rag/chat/sessions/:id', RagController.getChatSessionById);

// Notifications — admin broadcast
const NotificationController = require('../controllers/notification.controller');
const SystemSettingsController = require('../controllers/systemSettings.controller');
router.post('/notifications/broadcast', NotificationController.broadcast);

// AI / System settings (admin-managed)
router.get('/settings/ai', SystemSettingsController.getAiSettings);
router.put('/settings/ai', SystemSettingsController.updateAiSettings);
router.post('/settings/ai/test', SystemSettingsController.testAiSettings);
router.post('/settings/ai/clear-cache', SystemSettingsController.clearAiCache);
router.post('/settings/ai/test-cursor', SystemSettingsController.testCursorSettings);

module.exports = router;