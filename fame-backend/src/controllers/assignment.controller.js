const AssignmentRepository = require('../repositories/assignment.repository');
const SubmissionRepository = require('../repositories/submission.repository');
const GradingCriteriaRepository = require('../repositories/criteria.repository');
const CourseRepository = require('../repositories/course.repository');
const ApiResponse = require('../utils/apiResponse.util');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../constants/messages.constant');

class AssignmentController {
    // Get assignments by course (for teachers)
async getAssignmentsByCourse(req, res, next) {
    try {
        const { courseId } = req.params;
        
        const course = await CourseRepository.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        
        if (
            String(course.teacherId?._id || course.teacherId) !== String(req.user._id) &&
            req.user.role !== 'admin'
        ) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        
        const assignments = await AssignmentRepository.findByCourseId(courseId);
        
        const assignmentsWithStats = await Promise.all(assignments.map(async (assignment) => {
            const stats = await SubmissionRepository.getAssignmentStats(assignment._id);
            const obj = assignment.toObject ? assignment.toObject() : assignment;
            return {
                ...obj,
                submissionCount: stats.totalSubmissions,
                avgGrade: stats.avgGrade,
                gradedCount: stats.gradedCount,
                pendingCount: stats.pendingCount,
            };
        }));
        
        ApiResponse.success(res, assignmentsWithStats, 'Assignments retrieved successfully');
    } catch (error) {
        next(error);
    }
}

    // Get single assignment
async getAssignmentById(req, res, next) {
    try {
        const assignment = await AssignmentRepository.findById(req.params.id, { populate: ['courseId'] });
        
        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }
        
        // Get submission stats
        const submissions = await SubmissionRepository.findByAssignment(assignment._id);
        const graded = submissions.filter(s => s.grade);
        const avgGrade = graded.length > 0 
            ? Math.round(graded.reduce((sum, s) => sum + (s.grade || 0), 0) / graded.length)
            : 0;
        
        const assignmentWithStats = {
            ...assignment.toObject(),
            submissionCount: submissions.length,
            avgGrade: avgGrade,
            gradedCount: graded.length
        };
        
        ApiResponse.success(res, assignmentWithStats, 'Assignment retrieved successfully');
    } catch (error) {
        next(error);
    }
}

    // Create assignment
    async createAssignment(req, res, next) {
        try {
            const { courseId, ...assignmentData } = req.body;
            
            const course = await CourseRepository.findById(courseId);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.COURSE_NOT_FOUND
                });
            }
            
            // Check authorization
            if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized to create assignments for this course'
                });
            }
            
            const assignment = await AssignmentRepository.create({
                ...assignmentData,
                courseId,
                status: 'published'
            });
            
            ApiResponse.created(res, assignment, 'Assignment created successfully');
        } catch (error) {
            next(error);
        }
    }

    // Update assignment
    async updateAssignment(req, res, next) {
        try {
            const assignment = await AssignmentRepository.findById(req.params.id);
            
            if (!assignment) {
                return res.status(404).json({
                    success: false,
                    message: 'Assignment not found'
                });
            }
            
            const course = await CourseRepository.findById(assignment.courseId);
            if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized to update this assignment'
                });
            }
            
            const updatedAssignment = await AssignmentRepository.updateById(req.params.id, req.body);
            
            ApiResponse.success(res, updatedAssignment, 'Assignment updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Delete assignment
    async deleteAssignment(req, res, next) {
        try {
            const assignment = await AssignmentRepository.findById(req.params.id);
            
            if (!assignment) {
                return res.status(404).json({
                    success: false,
                    message: 'Assignment not found'
                });
            }
            
            const course = await CourseRepository.findById(assignment.courseId);
            if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized to delete this assignment'
                });
            }
            
            // Delete all related data
            await SubmissionRepository.deleteMany({ assignmentId: assignment._id });
            await GradingCriteriaRepository.deleteByAssignmentId(assignment._id);
            await AssignmentRepository.deleteById(req.params.id);
            
            ApiResponse.success(res, null, 'Assignment deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get submissions for assignment
    async getSubmissionsByAssignment(req, res, next) {
        try {
            const { assignmentId } = req.params;
            
            const assignment = await AssignmentRepository.findById(assignmentId);
            if (!assignment) {
                return res.status(404).json({
                    success: false,
                    message: 'Assignment not found'
                });
            }
            
            const course = await CourseRepository.findById(assignment.courseId);
            if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized to view these submissions'
                });
            }
            
            const submissions = await SubmissionRepository.findByAssignment(assignmentId);
            
            ApiResponse.success(res, submissions, 'Submissions retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AssignmentController();