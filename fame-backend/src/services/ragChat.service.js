const RagChatRepository = require('../repositories/ragChat.repository');

class RagChatService {
    async saveExchange({ sessionId, user, userMessage, assistantPayload }) {
        if (!user?._id || !userMessage?.trim() || !assistantPayload?.content) {
            return null;
        }

        if (sessionId) {
            const updated = await RagChatRepository.appendMessages(
                sessionId,
                user,
                userMessage.trim(),
                assistantPayload
            );
            if (updated) {
                return { sessionId: updated._id, title: updated.title };
            }
        }

        const created = await RagChatRepository.createSession(
            user,
            userMessage.trim(),
            assistantPayload
        );
        return { sessionId: created._id, title: created.title };
    }

    async getSessionsForAdmin(query = {}) {
        return RagChatRepository.listSessionsForAdmin(query);
    }

    async getMySessions(user, query = {}) {
        return RagChatRepository.listSessionsByUserId(user, query);
    }

    async getSessionById(sessionId, { adminView = false, user = null } = {}) {
        if (adminView) {
            const session = await RagChatRepository.findById(sessionId);
            return session?.isActive === false ? null : session;
        }

        if (!user?._id) return null;
        return RagChatRepository.findSessionForUser(sessionId, user);
    }

    async deleteMySession(sessionId, user) {
        if (!user?._id || !sessionId) return null;
        const deleted = await RagChatRepository.softDeleteSessionForUser(sessionId, user);
        if (!deleted) return null;
        return { sessionId: deleted._id };
    }

    async deleteAllMySessions(user) {
        if (!user?._id) return { deletedCount: 0 };
        const deletedCount = await RagChatRepository.softDeleteAllSessionsForUser(user);
        return { deletedCount };
    }
}

module.exports = new RagChatService();
