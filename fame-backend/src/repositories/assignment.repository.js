const Assignment = require('../models/Assignment.model');

class AssignmentRepository {
    async create(data) {
        return await Assignment.create(data);
    }

    async findById(id, options = {}) {
        const query = Assignment.findById(id);
        if (options.populate) {
            query.populate(options.populate);
        }
        return await query;
    }

    async findOne(filter) {
        return await Assignment.findOne(filter);
    }

    async findAll(filter = {}, options = {}) {
        let query = Assignment.find(filter);
        
        if (options.sort) {
            query = query.sort(options.sort);
        }
        if (options.populate) {
            query = query.populate(options.populate);
        }
        if (options.limit) {
            query = query.limit(options.limit);
        }
        if (options.skip) {
            query = query.skip(options.skip);
        }
        
        return await query;
    }

    async updateById(id, data) {
        return await Assignment.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true
        });
    }

    async deleteById(id) {
        return await Assignment.findByIdAndDelete(id);
    }

    async count(filter = {}) {
        return await Assignment.countDocuments(filter);
    }

    async findByCourseId(courseId) {
        return await Assignment.find({ courseId }).sort({ dueDate: 1 });
    }

    async getStats(courseId) {
        const assignments = await Assignment.find({ courseId });
        const totalSubmissions = assignments.reduce((sum, a) => sum + (a.totalSubmissions || 0), 0);
        const avgGrade = assignments.reduce((sum, a) => sum + (a.avgGrade || 0), 0) / (assignments.length || 1);
        
        return {
            totalAssignments: assignments.length,
            totalSubmissions,
            avgGrade: Math.round(avgGrade),
            openAssignments: assignments.filter(a => new Date(a.dueDate) > new Date()).length
        };
    }
}

module.exports = new AssignmentRepository();