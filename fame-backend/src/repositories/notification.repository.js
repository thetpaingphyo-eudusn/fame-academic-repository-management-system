const BaseRepository = require('./base.repository');
const Notification = require('../models/Notification.model');

class NotificationRepository extends BaseRepository {
    constructor() {
        super(Notification);
    }

    async listForUser(userId, { page = 1, limit = 20 } = {}) {
        const skip = (Math.max(1, page) - 1) * limit;
        const filter = { recipientId: userId };

        const [items, total] = await Promise.all([
            this.model
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.model.countDocuments(filter),
        ]);

        return {
            items,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async countUnread(userId) {
        return this.model.countDocuments({ recipientId: userId, read: false });
    }

    async markRead(notificationId, userId) {
        return this.model.findOneAndUpdate(
            { _id: notificationId, recipientId: userId },
            { read: true, readAt: new Date() },
            { returnDocument: 'after' }
        );
    }

    async markAllRead(userId) {
        const result = await this.model.updateMany(
            { recipientId: userId, read: false },
            { read: true, readAt: new Date() }
        );
        return result.modifiedCount;
    }

    async createMany(notifications) {
        if (!notifications.length) return [];
        return this.model.insertMany(notifications);
    }
}

module.exports = new NotificationRepository();
