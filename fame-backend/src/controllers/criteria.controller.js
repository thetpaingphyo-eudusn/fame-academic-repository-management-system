const GradingCriteriaRepository = require('../repositories/criteria.repository');
const AssignmentRepository = require('../repositories/assignment.repository');
const CourseRepository = require('../repositories/course.repository');
const ApiResponse = require('../utils/apiResponse.util');

class CriteriaController {
    // Get grading criteria for assignment
    async getGradingCriteria(req, res, next) {
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
                    message: 'Unauthorized'
                });
            }
            
            let criteria = await GradingCriteriaRepository.findByAssignmentId(assignmentId);
            
            if (!criteria) {
                criteria = {
                    assignmentId,
                    criteria: [],
                    totalWeight: 0,
                    passingGrade: 60,
                    createdBy: req.user._id
                };
            }
            
            ApiResponse.success(res, criteria, 'Grading criteria retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // Update grading criteria
    async updateGradingCriteria(req, res, next) {
        try {
            const { assignmentId } = req.params;
            const { criteria, passingGrade } = req.body;
            
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
                    message: 'Unauthorized'
                });
            }
            
            // Validate total weight
            const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
            if (totalWeight !== 100) {
                return res.status(400).json({
                    success: false,
                    message: `Total weight must be 100%. Currently: ${totalWeight}%`
                });
            }
            
            const updatedCriteria = await GradingCriteriaRepository.updateByAssignmentId(assignmentId, {
                criteria,
                passingGrade: passingGrade || 60,
                createdBy: req.user._id
            });
            
            ApiResponse.success(res, updatedCriteria, 'Grading criteria saved successfully');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CriteriaController();