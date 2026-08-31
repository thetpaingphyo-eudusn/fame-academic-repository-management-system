const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submission.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.use(authorize('teacher', 'admin'));

router.get('/:id', submissionController.getSubmissionById);
router.post('/:id/grade', submissionController.gradeSubmission);
router.put('/:id/approve', submissionController.approveSubmission);
router.put('/:id/revision', submissionController.requestRevision);

module.exports = router;