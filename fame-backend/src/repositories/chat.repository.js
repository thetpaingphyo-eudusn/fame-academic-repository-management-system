const ChatConversation = require('../models/ChatConversation.model');
const ChatMessage = require('../models/ChatMessage.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');

class ChatRepository {
    _uid(id) {
        return new mongoose.Types.ObjectId(String(id));
    }

    async findConversationByParticipants(userIdA, userIdB) {
        const ids = [userIdA, userIdB]
            .map((id) => this._uid(id))
            .sort((a, b) => String(a).localeCompare(String(b)));
        return ChatConversation.findOne({
            type: 'direct',
            participantIds: { $all: ids, $size: 2 },
            isActive: true,
        }).lean();
    }

    async createConversation(participants) {
        const participantIds = participants.map((p) => p.userId);
        return ChatConversation.create({
            type: 'direct',
            participants,
            participantIds,
            lastMessageAt: new Date(),
            userSettings: participantIds.map((userId) => ({ userId, isMuted: false, isHidden: false })),
        });
    }

    async listConversationsForUser(userId) {
        const uid = this._uid(userId);
        const conversations = await ChatConversation.find({
            participantIds: uid,
            isActive: true,
        })
            .sort({ lastMessageAt: -1 })
            .lean();

        return conversations.filter((conv) => {
            const setting = conv.userSettings?.find((s) => String(s.userId) === String(uid));
            return !setting?.isHidden;
        });
    }

    async findConversationById(conversationId) {
        return ChatConversation.findById(conversationId).lean();
    }

    _getUserSetting(conversation, userId) {
        return conversation?.userSettings?.find((s) => String(s.userId) === String(userId));
    }

    isMuted(conversation, userId) {
        return !!this._getUserSetting(conversation, userId)?.isMuted;
    }

    async unhideConversationForUser(conversationId, userId) {
        const uid = this._uid(userId);
        const conv = await ChatConversation.findById(conversationId);
        if (!conv) return null;

        const idx = conv.userSettings.findIndex((s) => String(s.userId) === String(uid));
        if (idx >= 0) {
            conv.userSettings[idx].isHidden = false;
            conv.userSettings[idx].hiddenAt = null;
        } else {
            conv.userSettings.push({ userId: uid, isMuted: false, isHidden: false });
        }
        await conv.save();
        return conv.toObject();
    }

    async setConversationHidden(conversationId, userId, hidden = true) {
        const uid = this._uid(userId);
        const conv = await ChatConversation.findById(conversationId);
        if (!conv) return null;

        const idx = conv.userSettings.findIndex((s) => String(s.userId) === String(uid));
        if (idx >= 0) {
            conv.userSettings[idx].isHidden = hidden;
            conv.userSettings[idx].hiddenAt = hidden ? new Date() : null;
        } else {
            conv.userSettings.push({ userId: uid, isMuted: false, isHidden: hidden, hiddenAt: hidden ? new Date() : null });
        }
        await conv.save();
        return conv.toObject();
    }

    async setConversationMuted(conversationId, userId, muted = true) {
        const uid = this._uid(userId);
        const conv = await ChatConversation.findById(conversationId);
        if (!conv) return null;

        const idx = conv.userSettings.findIndex((s) => String(s.userId) === String(uid));
        if (idx >= 0) {
            conv.userSettings[idx].isMuted = muted;
        } else {
            conv.userSettings.push({ userId: uid, isMuted: muted, isHidden: false });
        }
        await conv.save();
        return conv.toObject();
    }

    async updateConversationLastMessage(conversationId, lastMessage) {
        return ChatConversation.findByIdAndUpdate(
            conversationId,
            { lastMessage, lastMessageAt: lastMessage.createdAt || new Date() },
            { returnDocument: 'after' }
        ).lean();
    }

    async setPinnedMessage(conversationId, messageId) {
        return ChatConversation.findByIdAndUpdate(
            conversationId,
            { pinnedMessageId: messageId },
            { returnDocument: 'after' }
        ).lean();
    }

    async clearPinnedMessage(conversationId) {
        return ChatConversation.findByIdAndUpdate(
            conversationId,
            { pinnedMessageId: null },
            { returnDocument: 'after' }
        ).lean();
    }

    async createMessage(data) {
        return ChatMessage.create(data);
    }

    async listMessages(conversationId, { page = 1, limit = 50 } = {}) {
        const skip = (Math.max(1, page) - 1) * limit;
        const [items, total] = await Promise.all([
            ChatMessage.find({ conversationId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            ChatMessage.countDocuments({ conversationId }),
        ]);
        return { items: items.reverse(), pagination: { page: Number(page), limit: Number(limit), total } };
    }

    async findMessageById(messageId) {
        return ChatMessage.findById(messageId).lean();
    }

    async updateMessage(messageId, updates) {
        return ChatMessage.findByIdAndUpdate(messageId, updates, { returnDocument: 'after' }).lean();
    }

    async unpinAllInConversation(conversationId) {
        await ChatMessage.updateMany({ conversationId, isPinned: true }, { isPinned: false, pinnedAt: null });
    }

    async markMessagesRead(conversationId, userId) {
        const now = new Date();
        const uid = this._uid(userId);
        await ChatMessage.updateMany(
            {
                conversationId,
                senderId: { $ne: uid },
                isDeleted: false,
                'readBy.userId': { $ne: uid },
            },
            { $push: { readBy: { userId: uid, readAt: now } } }
        );
        return now;
    }

    async countUnreadInConversation(conversationId, userId) {
        return ChatMessage.countDocuments({
            conversationId,
            senderId: { $ne: this._uid(userId) },
            isDeleted: false,
            'readBy.userId': { $ne: this._uid(userId) },
        });
    }

    async getUnreadSummary(userId) {
        const uid = this._uid(userId);
        const conversations = await ChatConversation.find({ participantIds: uid, isActive: true }).select('_id userSettings').lean();

        const visible = conversations.filter((conv) => {
            const setting = conv.userSettings?.find((s) => String(s.userId) === String(uid));
            return !setting?.isHidden;
        });

        const counts = await Promise.all(
            visible.map(async (conv) => ({
                conversationId: String(conv._id),
                unreadCount: await this.countUnreadInConversation(conv._id, userId),
            }))
        );

        const totalUnread = counts.reduce((sum, c) => sum + c.unreadCount, 0);
        return { totalUnread, conversations: counts };
    }

    async enrichConversations(conversations, userId) {
        const uid = String(userId);
        return Promise.all(
            conversations.map(async (conv) => {
                const setting = conv.userSettings?.find((s) => String(s.userId) === uid);
                const unreadCount = await this.countUnreadInConversation(conv._id, userId);
                const other = conv.participants?.find((p) => String(p.userId) !== uid);
                let lastMessageSeen = false;
                if (other && String(conv.lastMessage?.senderId) === uid) {
                    const lastMsg = await ChatMessage.findOne({ conversationId: conv._id, isDeleted: false })
                        .sort({ createdAt: -1 })
                        .select('senderId readBy')
                        .lean();
                    if (lastMsg && String(lastMsg.senderId) === uid) {
                        lastMessageSeen = lastMsg.readBy?.some((r) => String(r.userId) === String(other.userId));
                    }
                }
                return {
                    ...conv,
                    unreadCount,
                    isMuted: !!setting?.isMuted,
                    lastMessageSeen,
                };
            })
        );
    }

    async getContactsForUser(user) {
        const role = user.role;
        const baseSelect = '_id name email role profileImage isActive';

        if (role === 'admin') {
            return User.find({ role: { $in: ['teacher', 'student'] }, isActive: { $ne: false } })
                .select(baseSelect)
                .sort({ name: 1 })
                .lean();
        }

        if (role === 'teacher') {
            const [admins, students] = await Promise.all([
                User.find({ role: 'admin', isActive: { $ne: false } }).select(baseSelect).lean(),
                User.find({
                    role: 'student',
                    isActive: { $ne: false },
                })
                    .select(baseSelect)
                    .sort({ name: 1 })
                    .lean(),
            ]);
            return [...admins, ...students];
        }

        const student = await User.findById(user._id).select('assignedCourses').lean();
        const courseIds = student?.assignedCourses || [];
        const [admins, teachers] = await Promise.all([
            User.find({ role: 'admin', isActive: { $ne: false } }).select(baseSelect).lean(),
            courseIds.length
                ? User.find({
                      role: 'teacher',
                      assignedCourses: { $in: courseIds },
                      isActive: { $ne: false },
                  })
                      .select(baseSelect)
                      .sort({ name: 1 })
                      .lean()
                : User.find({ role: 'teacher', isActive: { $ne: false } }).select(baseSelect).sort({ name: 1 }).lean(),
        ]);
        return [...admins, ...teachers];
    }
}

module.exports = new ChatRepository();
