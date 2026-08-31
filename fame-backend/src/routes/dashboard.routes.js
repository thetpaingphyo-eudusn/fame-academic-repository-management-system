const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// All dashboard routes require authentication
router.use(protect);

// Role-based dashboard
router.get('/admin', authorize('admin'), DashboardController.getAdminDashboard);
router.get('/teacher', authorize('teacher'), DashboardController.getTeacherDashboard);
router.get('/student', authorize('student'), DashboardController.getStudentDashboard);

module.exports = router;