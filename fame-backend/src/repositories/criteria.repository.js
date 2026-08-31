const GradingCriteria = require('../models/GradingCriteria.model');

class GradingCriteriaRepository {
    async create(data) {
        return await GradingCriteria.create(data);
    }

    async findById(id) {
        return await GradingCriteria.findById(id);
    }

    async findByAssignmentId(assignmentId) {
        return await GradingCriteria.findOne({ assignmentId });
    }

    async findByAssignmentIds(assignmentIds) {
        if (!assignmentIds?.length) return [];
        return await GradingCriteria.find({ assignmentId: { $in: assignmentIds } });
    }

    async updateByAssignmentId(assignmentId, data) {
        return await GradingCriteria.findOneAndUpdate(
            { assignmentId },
            data,
            { new: true, upsert: true, runValidators: true }
        );
    }

    async deleteByAssignmentId(assignmentId) {
        return await GradingCriteria.findOneAndDelete({ assignmentId });
    }

    async validateTotalWeight(criteria) {
        const total = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
        return total === 100;
    }
}

module.exports = new GradingCriteriaRepository();