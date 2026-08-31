const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/student.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { uploadProjectFiles } = require('../middleware/upload.middleware');

router.use(protect);
router.use(authorize('student'));

// ==================== COURSE ROUTES ====================
router.get('/courses', StudentController.getMyCourses);
router.get('/courses/:courseId/assignments', StudentController.getAssignmentsByCourse);
router.get('/courses/:courseId', StudentController.getCourseById);
router.get('/assignments/:assignmentId/criteria', StudentController.getAssignmentGradingCriteria);

// ==================== PROJECT ROUTES ====================
router.get('/projects', StudentController.getMyProjects);
router.get('/projects/:id', StudentController.getProjectById);
router.post('/projects', StudentController.createProject);
router.put('/projects/:id', StudentController.updateProject);
router.delete('/projects/:id', StudentController.deleteProject);
router.post('/projects/:id/upload', uploadProjectFiles, StudentController.uploadProjectFiles);
router.get('/projects/:id/versions', StudentController.getProjectVersions);
router.get('/projects/:id/ai-analyses', StudentController.getProjectAiAnalyses);
router.post('/projects/:id/versions/:versionId/analyze', StudentController.analyzeProjectVersion);
router.get('/projects/:id/download', StudentController.downloadProject);

// ==================== FEEDBACK ROUTES ====================
router.get('/feedback', StudentController.getMyFeedback);
router.get('/projects/:id/feedback', StudentController.getProjectFeedback);

// ==================== PROFILE ROUTES ====================
router.get('/profile', StudentController.getProfile);
router.put('/profile', StudentController.updateProfile);
router.get('/stats', StudentController.getStats);

// ==================== SEARCH ====================
router.get('/search', StudentController.searchMyProjects);

module.exports = router;