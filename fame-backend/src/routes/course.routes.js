const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/course.controller');
const { protect } = require('../middleware/auth.middleware');

// All course routes require authentication
router.use(protect);

// Public course routes (for all authenticated users)
router.get('/', CourseController.getAllCourses);
router.get('/:id', CourseController.getCourseById);
router.get('/department/:department', CourseController.getCoursesByDepartment);
router.get('/teacher/:teacherId', CourseController.getCoursesByTeacher);

module.exports = router;