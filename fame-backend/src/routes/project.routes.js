const express = require('express');
const router = express.Router();
const ProjectController = require('../controllers/project.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// All routes require authentication
router.use(protect);

// ==================== ADMIN ONLY ====================
router.delete('/admin/:id', authorize('admin'), ProjectController.deleteProject);

// ==================== TEACHER & ADMIN ====================
router.get('/teacher', authorize('teacher', 'admin'), ProjectController.getTeacherProjects);
router.put('/teacher/:id/grade', authorize('teacher', 'admin'), ProjectController.gradeProject);
router.put('/teacher/:id/approve', authorize('teacher', 'admin'), ProjectController.approveProject);
router.put('/teacher/:id/reject', authorize('teacher', 'admin'), ProjectController.rejectProject);
router.put('/teacher/:id/revision', authorize('teacher', 'admin'), ProjectController.requestRevision);

// ==================== ALL AUTHENTICATED USERS ====================
router.get('/', ProjectController.getAllProjects);
router.get('/:id/download', ProjectController.downloadProject);
router.get('/:id', ProjectController.getProjectById);
router.post('/:projectId/compare', authorize('teacher', 'admin'), ProjectController.compareVersions);
router.get('/stats/summary', authorize('teacher', 'admin'), ProjectController.getProjectStats);
router.get('/search/:keyword', authorize('teacher', 'admin'), ProjectController.searchProjects);

module.exports = router;