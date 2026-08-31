const SubmissionRepository = require('../repositories/submission.repository');
const AssignmentRepository = require('../repositories/assignment.repository');
const CourseRepository = require('../repositories/course.repository');
const GradingCriteriaRepository = require('../repositories/criteria.repository');
const ApiResponse = require('../utils/apiResponse.util');

class SubmissionController {
    // Grade a submission
    async gradeSubmission(req, res, next) {
        try {
            const { id } = req.params;
            const { grade, feedback, scores } = req.body;
            
            const submission = await SubmissionRepository.findById(id);
            if (!submission) {
                return res.status(404).json({
                    success: false,
                    message: 'Submission not found'
                });
            }
            
            const assignment = await AssignmentRepository.findById(submission.assignmentId);
            const course = await CourseRepository.findById(assignment.courseId);
            
            if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            // Calculate late penalty
            let finalGrade = grade;
            if (submission.isLate && assignment.allowLate) {
                const penalty = submission.daysLate * assignment.latePenalty;
                finalGrade = Math.max(0, grade - (grade * penalty / 100));
            }
            
            const updatedSubmission = await SubmissionRepository.updateById(id, {
                grade: Math.round(finalGrade),
                feedback,
                scores: new Map(Object.entries(scores || {})),
                status: 'graded',
                gradedBy: req.user._id,
                gradedAt: new Date()
            });
            
            // Update assignment stats
            const stats = await SubmissionRepository.getAssignmentStats(assignment._id);
            await AssignmentRepository.updateById(assignment._id, {
                avgGrade: stats.avgGrade,
                totalSubmissions: stats.totalSubmissions
            });
            
            ApiResponse.success(res, updatedSubmission, 'Grade submitted successfully');
        } catch (error) {
            next(error);
        }
    }

    // Approve submission
    async approveSubmission(req, res, next) {
        try {
            const { id } = req.params;
            
            const submission = await SubmissionRepository.findById(id);
            if (!submission) {
                return res.status(404).json({
                    success: false,
                    message: 'Submission not found'
                });
            }
            
            const assignment = await AssignmentRepository.findById(submission.assignmentId);
            const course = await CourseRepository.findById(assignment.courseId);
            
            if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            const updatedSubmission = await SubmissionRepository.updateById(id, {
                status: 'approved'
            });
            
            ApiResponse.success(res, updatedSubmission, 'Submission approved successfully');
        } catch (error) {
            next(error);
        }
    }

    // Request revision
    async requestRevision(req, res, next) {
        try {
            const { id } = req.params;
            const { revisionNotes } = req.body;
            
            const submission = await SubmissionRepository.findById(id);
            if (!submission) {
                return res.status(404).json({
                    success: false,
                    message: 'Submission not found'
                });
            }
            
            const assignment = await AssignmentRepository.findById(submission.assignmentId);
            const course = await CourseRepository.findById(assignment.courseId);
            
            if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            
            const updatedSubmission = await SubmissionRepository.updateById(id, {
                status: 'revision',
                revisionNotes
            });
            
            ApiResponse.success(res, updatedSubmission, 'Revision requested successfully');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SubmissionController();