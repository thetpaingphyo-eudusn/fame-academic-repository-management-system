const ChatService = require('../services/chat.service');
const ApiResponse = require('../utils/apiResponse.util');
const path = require('path');
const multer = require('multer');
const LocalStorageService = require('../services/localStorage.service');

const chatUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, true),
}).single('file');

class ChatController {
    async getContacts(req, res, next) {
        try {
            const contacts = await ChatService.getContacts(req.user);
            ApiResponse.success(res, contacts, 'Contacts retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getUnreadSummary(req, res, next) {
        try {
            const summary = await ChatService.getUnreadSummary(req.user._id);
            ApiResponse.success(res, summary, 'Unread summary retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getConversations(req, res, next) {
        try {
            const conversations = await ChatService.getConversations(req.user._id);
            ApiResponse.success(res, conversations, 'Conversations retrieved');
        } catch (error) {
            next(error);
        }
    }

    async createConversation(req, res, next) {
        try {
            const { userId } = req.body;
            if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });
            const result = await ChatService.getOrCreateDirectConversation(req.user, userId);
            if (!result.success) return res.status(400).json(result);
            ApiResponse.success(res, result.conversation, 'Conversation ready');
        } catch (error) {
            next(error);
        }
    }

    async getMessages(req, res, next) {
        try {
            const { page = 1, limit = 50 } = req.query;
            const result = await ChatService.getMessages(req.params.id, req.user._id, {
                page: parseInt(page, 10) || 1,
                limit: Math.min(parseInt(limit, 10) || 50, 100),
            });
            if (!result.success) return res.status(404).json(result);
            ApiResponse.success(res, { items: result.items, conversation: result.conversation }, 'Messages retrieved');
        } catch (error) {
            next(error);
        }
    }

    async sendMessage(req, res, next) {
        try {
            const { content, type, attachments, replyTo } = req.body;
            const result = await ChatService.sendMessage({
                conversationId: req.params.id,
                user: req.user,
                content,
                type,
                attachments,
                replyTo,
            });
            if (!result.success) return res.status(400).json(result);
            ApiResponse.success(res, result, 'Message sent');
        } catch (error) {
            next(error);
        }
    }

    async forwardMessage(req, res, next) {
        try {
            const { targetConversationId } = req.body;
            if (!targetConversationId) {
                return res.status(400).json({ success: false, message: 'targetConversationId is required' });
            }
            const result = await ChatService.forwardMessage(req.params.id, req.user, targetConversationId);
            if (!result.success) return res.status(400).json(result);
            ApiResponse.success(res, result, 'Message forwarded');
        } catch (error) {
            next(error);
        }
    }

    async editMessage(req, res, next) {
        try {
            const result = await ChatService.editMessage(req.params.id, req.user, req.body.content);
            if (!result.success) return res.status(400).json(result);
            ApiResponse.success(res, result.message, 'Message updated');
        } catch (error) {
            next(error);
        }
    }

    async deleteMessage(req, res, next) {
        try {
            const result = await ChatService.deleteMessage(req.params.id, req.user);
            if (!result.success) return res.status(400).json(result);
            ApiResponse.success(res, result.message, 'Message deleted');
        } catch (error) {
            next(error);
        }
    }

    async pinMessage(req, res, next) {
        try {
            const pin = req.body.pin !== false;
            const result = await ChatService.pinMessage(req.params.id, req.user, pin);
            if (!result.success) return res.status(400).json(result);
            ApiResponse.success(res, result, pin ? 'Message pinned' : 'Message unpinned');
        } catch (error) {
            next(error);
        }
    }

    async muteConversation(req, res, next) {
        try {
            const mute = req.body.mute !== false;
            const result = await ChatService.muteConversation(req.params.id, req.user, mute);
            if (!result.success) return res.status(400).json(result);
            ApiResponse.success(res, result.conversation, mute ? 'Conversation muted' : 'Conversation unmuted');
        } catch (error) {
            next(error);
        }
    }

    async deleteConversation(req, res, next) {
        try {
            const result = await ChatService.deleteConversation(req.params.id, req.user);
            if (!result.success) return res.status(400).json(result);
            ApiResponse.success(res, null, 'Conversation deleted');
        } catch (error) {
            next(error);
        }
    }

    uploadAttachment(req, res, next) {
        chatUpload(req, res, async (err) => {
            if (err) return res.status(400).json({ success: false, message: err.message });
            try {
                if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

                const safeName = req.file.originalname.replace(/[^\w.\-() ]/g, '_');
                const folder = path.join('chat', String(req.user._id));
                const saved = await LocalStorageService.saveFile(req.file.buffer, folder, `${Date.now()}_${safeName}`);

                const mimeType = req.file.mimetype || 'application/octet-stream';
                let type = 'file';
                if (mimeType.startsWith('image/')) type = 'image';
                else if (mimeType.startsWith('video/')) type = 'video';

                ApiResponse.success(
                    res,
                    { url: saved.secure_url, fileName: safeName, mimeType, size: saved.bytes, type },
                    'File uploaded'
                );
            } catch (error) {
                next(error);
            }
        });
    }
}

module.exports = new ChatController();
