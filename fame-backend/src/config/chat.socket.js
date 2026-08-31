const ChatService = require('../services/chat.service');
const ChatRepository = require('../repositories/chat.repository');

const registerChatHandlers = (io, socket) => {
    const user = socket.user;

    socket.on('chat:join', ({ conversationId }) => {
        if (conversationId) socket.join(`conversation:${conversationId}`);
    });

    socket.on('chat:leave', ({ conversationId }) => {
        if (conversationId) socket.leave(`conversation:${conversationId}`);
    });

    socket.on('chat:send', async (payload, callback) => {
        try {
            const result = await ChatService.sendMessage({
                conversationId: payload.conversationId,
                user,
                content: payload.content,
                type: payload.type,
                attachments: payload.attachments || [],
                replyTo: payload.replyTo || null,
            });
            if (typeof callback === 'function') callback(result);
        } catch (error) {
            if (typeof callback === 'function') callback({ success: false, message: error.message });
        }
    });

    socket.on('chat:typing', ({ conversationId, isTyping }) => {
        if (!conversationId) return;
        socket.to(`conversation:${conversationId}`).emit('chat:typing', {
            conversationId,
            userId: String(user._id),
            userName: user.name,
            isTyping: !!isTyping,
        });
    });

    socket.on('chat:read', async ({ conversationId }) => {
        if (!conversationId) return;
        await ChatService.markRead(conversationId, user._id);
    });
};

module.exports = registerChatHandlers;
