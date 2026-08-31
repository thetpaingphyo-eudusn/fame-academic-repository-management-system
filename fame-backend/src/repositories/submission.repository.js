const Submission = require('../models/Submission.model');

class SubmissionRepository {
    async create(data) {
        return await Submission.create(data);
    }

    async findById(id, options = {}) {
        let query = Submission.findById(id);
        if (options.populate) {
            query = query.populate(options.populate);
        }
        return await query;
    }

    async findOne(filter) {
        return await Submission.findOne(filter);
    }

    async findAll(filter = {}, options = {}) {
        let query = Submission.find(filter);
        
        if (options.sort) {
            query = query.sort(options.sort);
        }
        if (options.populate) {
            query = query.populate(options.populate);
        }
        if (options.limit) {
            query = query.limit(options.limit);
        }
        
        return await query;
    }

    async updateById(id, data) {
        return await Submission.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true
        });
    }

    async deleteById(id) {
        return await Submission.findByIdAndDelete(id);
    }

    async findByAssignment(assignmentId) {
        return await Submission.find({ assignmentId })
            .populate('studentId', 'name email studentId')
            .sort({ submittedAt: -1 });
    }

    async findByStudentAndAssignment(studentId, assignmentId) {
        return await Submission.findOne({ studentId, assignmentId });
    }

    async getAssignmentStats(assignmentId) {
        const submissions = await Submission.find({ assignmentId });
        
        return {
            totalSubmissions: submissions.length,
            gradedCount: submissions.filter(s => s.grade).length,
            pendingCount: submissions.filter(s => !s.grade && s.status === 'submitted').length,
            revisionCount: submissions.filter(s => s.status === 'revision').length,
            avgGrade: submissions.length > 0 
                ? Math.round(submissions.reduce((sum, s) => sum + (s.grade || 0), 0) / submissions.length)
                : 0,
            lateCount: submissions.filter(s => s.isLate).length
        };
    }
}

module.exports = new SubmissionRepository();