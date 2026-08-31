const CodingAssistantSession = require('../models/CodingAssistantSession.model');

class CodingAssistantSessionRepository {
    async listByUser(userId, { limit = 30 } = {}) {
        return CodingAssistantSession.find({ userId })
            .sort({ updatedAt: -1 })
            .limit(Math.min(limit, 100))
            .select('title mode language prompt updatedAt createdAt files.name issues')
            .lean();
    }

    async findByIdForUser(id, userId) {
        return CodingAssistantSession.findOne({ _id: id, userId }).lean();
    }

    async create(data) {
        return CodingAssistantSession.create(data);
    }

    async update(id, userId, data) {
        return CodingAssistantSession.findOneAndUpdate({ _id: id, userId }, data, { new: true }).lean();
    }

    async delete(id, userId) {
        return CodingAssistantSession.findOneAndDelete({ _id: id, userId });
    }
}

module.exports = new CodingAssistantSessionRepository();
