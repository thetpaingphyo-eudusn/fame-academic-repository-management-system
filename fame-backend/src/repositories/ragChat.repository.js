const BaseRepository = require('./base.repository');
const RagChatSession = require('../models/RagChatSession.model');

class RagChatRepository extends BaseRepository {
    constructor() {
        super(RagChatSession);
    }

    async repairSessionsForUser(user) {
        if (!user?._id || !user?.email) return 0;

        const email = String(user.email).trim().toLowerCase();
        const result = await this.model.updateMany(
            {
                isActive: true,
                userEmail: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
                userId: { $ne: user._id },
            },
            {
                $set: {
                    userId: user._id,
                    userName: user.name || 'Unknown',
                    userRole: user.role,
                },
            }
        );

        return result.modifiedCount || 0;
    }

    _buildUserSessionFilter(user, search) {
        const email = user?.email ? String(user.email).trim() : '';
        const filter = {
            isActive: true,
            $or: [{ userId: user._id }],
        };

        if (email) {
            filter.$or.push({ userEmail: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        }

        if (search?.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            return {
                isActive: true,
                $and: [
                    { $or: filter.$or },
                    { $or: [{ title: regex }, { 'messages.content': regex }] },
                ],
            };
        }

        return filter;
    }

    async appendMessages(sessionId, user, userMessage, assistantPayload) {
        const userMsg = {
            role: 'user',
            content: userMessage,
            createdAt: new Date(),
        };
        const assistantMsg = {
            role: 'assistant',
            content: assistantPayload.content,
            source: assistantPayload.source || null,
            links: assistantPayload.links || [],
            charts: assistantPayload.charts || [],
            createdAt: new Date(),
        };

        const email = user?.email ? String(user.email).trim() : '';
        const ownershipFilter = email
            ? {
                $or: [
                    { userId: user._id },
                    { userEmail: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                ],
            }
            : { userId: user._id };

        return this.model.findOneAndUpdate(
            { _id: sessionId, ...ownershipFilter, isActive: true },
            {
                $push: { messages: { $each: [userMsg, assistantMsg] } },
                $set: {
                    lastMessageAt: new Date(),
                    userId: user._id,
                    userName: user.name || 'Unknown',
                    userEmail: user.email || '',
                    userRole: user.role,
                },
                $inc: { messageCount: 2 },
            },
            { returnDocument: 'after' }
        );
    }

    async createSession(user, userMessage, assistantPayload) {
        const userMsg = {
            role: 'user',
            content: userMessage,
            createdAt: new Date(),
        };
        const assistantMsg = {
            role: 'assistant',
            content: assistantPayload.content,
            source: assistantPayload.source || null,
            links: assistantPayload.links || [],
            charts: assistantPayload.charts || [],
            createdAt: new Date(),
        };

        return this.create({
            userId: user._id,
            userName: user.name || 'Unknown',
            userEmail: user.email || '',
            userRole: user.role,
            title: String(userMessage).trim().slice(0, 100) || 'New chat',
            messages: [userMsg, assistantMsg],
            messageCount: 2,
            lastMessageAt: new Date(),
        });
    }

    async listSessionsForAdmin({ role, search, page = 1, limit = 20 }) {
        const filter = { isActive: true };
        if (role) filter.userRole = role;
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$or = [{ userName: regex }, { userEmail: regex }, { title: regex }];
        }

        const skip = (Math.max(1, page) - 1) * limit;
        const [items, total] = await Promise.all([
            this.model
                .find(filter)
                .select('userId userName userEmail userRole title messageCount lastMessageAt createdAt updatedAt')
                .sort({ lastMessageAt: -1 })
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

    async listSessionsByUserId(user, { search, page = 1, limit = 50 } = {}) {
        await this.repairSessionsForUser(user);
        const filter = this._buildUserSessionFilter(user, search);

        const skip = (Math.max(1, page) - 1) * limit;
        const [items, total] = await Promise.all([
            this.model
                .find(filter)
                .select('title messageCount lastMessageAt createdAt updatedAt')
                .sort({ lastMessageAt: -1 })
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

    async findSessionForUser(sessionId, user) {
        await this.repairSessionsForUser(user);
        const email = user?.email ? String(user.email).trim() : '';
        const ownershipFilter = email
            ? {
                $or: [
                    { userId: user._id },
                    { userEmail: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                ],
            }
            : { userId: user._id };

        return this.model.findOne({ _id: sessionId, isActive: true, ...ownershipFilter });
    }

    _ownershipFilterForUser(user) {
        const email = user?.email ? String(user.email).trim() : '';
        return email
            ? {
                $or: [
                    { userId: user._id },
                    { userEmail: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                ],
            }
            : { userId: user._id };
    }

    async softDeleteSessionForUser(sessionId, user) {
        await this.repairSessionsForUser(user);
        return this.model.findOneAndUpdate(
            { _id: sessionId, isActive: true, ...this._ownershipFilterForUser(user) },
            { $set: { isActive: false } },
            { returnDocument: 'after' }
        );
    }

    async softDeleteAllSessionsForUser(user) {
        await this.repairSessionsForUser(user);
        const filter = this._buildUserSessionFilter(user);
        const result = await this.model.updateMany(filter, { $set: { isActive: false } });
        return result.modifiedCount || 0;
    }
}

module.exports = new RagChatRepository();
