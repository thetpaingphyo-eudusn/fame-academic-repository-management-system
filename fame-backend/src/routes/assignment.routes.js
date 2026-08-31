const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const criteriaController = require('../controllers/criteria.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);
router.use(authorize('teacher', 'admin'));

// Assignment routes
router.get('/course/:courseId', assignmentController.getAssignmentsByCourse);
router.get('/:id', assignmentController.getAssignmentById);
router.post('/', assignmentController.createAssignment);
router.put('/:id', assignmentController.updateAssignment);
router.delete('/:id', assignmentController.deleteAssignment);
router.get('/:assignmentId/submissions', assignmentController.getSubmissionsByAssignment);

// Grading criteria routes
router.get('/:assignmentId/criteria', criteriaController.getGradingCriteria);
router.put('/:assignmentId/criteria', criteriaController.updateGradingCriteria);

module.exports = router;