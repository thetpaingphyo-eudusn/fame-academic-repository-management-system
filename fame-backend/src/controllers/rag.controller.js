const GeminiRagService = require('../services/geminiRag.service');
const RagChatService = require('../services/ragChat.service');
const ApiResponse = require('../utils/apiResponse.util');

class RagController {
    async chat(req, res, next) {
        try {
            const { message, history = [], sessionId = null, chartMode = false } = req.body;

            if (!message || !String(message).trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Message is required',
                });
            }

            const result = await GeminiRagService.chat(message, req.user, history, { chartMode: !!chartMode });

            if (!result.success) {
                return res.status(400).json(result);
            }

            const saved = await RagChatService.saveExchange({
                sessionId,
                user: req.user,
                userMessage: message,
                assistantPayload: {
                    content: result.answer,
                    source: result.source,
                    links: result.links || [],
                    charts: result.charts || [],
                },
            });

            if (saved?.sessionId) {
                result.sessionId = saved.sessionId;
            }

            ApiResponse.success(res, result, 'Chat response generated');
        } catch (error) {
            next(error);
        }
    }

    async getStatus(req, res, next) {
        try {
            const status = await GeminiRagService.getTrainingStatus();
            ApiResponse.success(res, status, 'RAG status retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getChatSessions(req, res, next) {
        try {
            const { role, search, page = 1, limit = 20 } = req.query;
            const data = await RagChatService.getSessionsForAdmin({
                role: role || undefined,
                search,
                page: parseInt(page, 10) || 1,
                limit: Math.min(parseInt(limit, 10) || 20, 100),
            });
            ApiResponse.paginated(res, data.items, data.pagination, 'Chat sessions retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getChatSessionById(req, res, next) {
        try {
            const session = await RagChatService.getSessionById(req.params.id, { adminView: true });
            if (!session) {
                return res.status(404).json({ success: false, message: 'Chat session not found' });
            }
            ApiResponse.success(res, session, 'Chat session retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getMyChatSessions(req, res, next) {
        try {
            const { search, page = 1, limit = 50 } = req.query;
            const data = await RagChatService.getMySessions(req.user, {
                search,
                page: parseInt(page, 10) || 1,
                limit: Math.min(parseInt(limit, 10) || 50, 100),
            });
            ApiResponse.paginated(res, data.items, data.pagination, 'Your chat sessions retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getMyChatSessionById(req, res, next) {
        try {
            const session = await RagChatService.getSessionById(req.params.id, {
                adminView: false,
                user: req.user,
            });
            if (!session) {
                return res.status(404).json({ success: false, message: 'Chat session not found' });
            }
            ApiResponse.success(res, session, 'Chat session retrieved');
        } catch (error) {
            next(error);
        }
    }

    async deleteMyChatSession(req, res, next) {
        try {
            const result = await RagChatService.deleteMySession(req.params.id, req.user);
            if (!result) {
                return res.status(404).json({ success: false, message: 'Chat session not found' });
            }
            ApiResponse.success(res, result, 'Chat deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async deleteAllMyChatSessions(req, res, next) {
        try {
            const result = await RagChatService.deleteAllMySessions(req.user);
            ApiResponse.success(res, result, 'All chats deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RagController();
