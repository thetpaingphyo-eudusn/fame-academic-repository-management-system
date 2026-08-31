const ChatRepository = require('../repositories/chat.repository');
const NotificationService = require('./notification.service');
const { emitToUser } = require('../config/socket.io.instance');

class ChatService {
    _participantSnapshot(user) {
        return {
            userId: user._id,
            userName: user.name || 'User',
            userRole: user.role,
            userEmail: user.email || '',
        };
    }

    _isParticipant(conversation, userId) {
        return conversation?.participantIds?.some((id) => String(id) === String(userId));
    }

    _otherParticipants(conversation, userId) {
        return conversation.participants.filter((p) => String(p.userId) !== String(userId));
    }

    _messagePreview(type, text) {
        if (type === 'image') return '📷 Photo';
        if (type === 'video') return '🎬 Video';
        if (type === 'file') return '📎 File';
        return String(text || '').slice(0, 120);
    }

    async _emitUnreadToParticipants(conversation) {
        for (const id of conversation.participantIds) {
            const summary = await ChatRepository.getUnreadSummary(id);
            emitToUser(String(id), 'chat:unread', summary);
        }
    }

    _emitConversation(conversation, event, payload) {
        conversation.participantIds.forEach((id) => {
            emitToUser(String(id), event, payload);
        });
    }

    async _emitNewMessage(conversationId, message) {
        const conversation = await ChatRepository.findConversationById(conversationId);
        if (!conversation) return;

        for (const id of conversation.participantIds) {
            const [enriched] = await ChatRepository.enrichConversations([conversation], id);
            emitToUser(String(id), 'chat:message', { message, conversation: enriched });
        }
    }

    async getContacts(user) {
        const contacts = await ChatRepository.getContactsForUser(user);
        return contacts.filter((c) => String(c._id) !== String(user._id));
    }

    async getConversations(userId) {
        const list = await ChatRepository.listConversationsForUser(userId);
        return ChatRepository.enrichConversations(list, userId);
    }

    async getUnreadSummary(userId) {
        return ChatRepository.getUnreadSummary(userId);
    }

    async getOrCreateDirectConversation(currentUser, otherUserId) {
        if (String(currentUser._id) === String(otherUserId)) {
            return { success: false, message: 'Cannot chat with yourself' };
        }

        const contacts = await this.getContacts(currentUser);
        if (!contacts.some((c) => String(c._id) === String(otherUserId))) {
            return { success: false, message: 'You cannot start a chat with this user' };
        }

        let conversation = await ChatRepository.findConversationByParticipants(currentUser._id, otherUserId);
        if (conversation) {
            conversation = await ChatRepository.unhideConversationForUser(conversation._id, currentUser._id);
            const enriched = await ChatRepository.enrichConversations([conversation], currentUser._id);
            return { success: true, conversation: enriched[0] };
        }

        const otherUser = contacts.find((c) => String(c._id) === String(otherUserId));
        conversation = await ChatRepository.createConversation([
            this._participantSnapshot(currentUser),
            {
                userId: otherUser._id,
                userName: otherUser.name,
                userRole: otherUser.role,
                userEmail: otherUser.email,
            },
        ]);

        const obj = conversation.toObject ? conversation.toObject() : conversation;
        const enriched = await ChatRepository.enrichConversations([obj], currentUser._id);
        return { success: true, conversation: enriched[0] };
    }

    async getMessages(conversationId, userId, query) {
        const conversation = await ChatRepository.findConversationById(conversationId);
        if (!conversation || !this._isParticipant(conversation, userId)) {
            return { success: false, message: 'Conversation not found' };
        }

        const data = await ChatRepository.listMessages(conversationId, query);
        const readAt = await ChatRepository.markMessagesRead(conversationId, userId);
        await this._emitUnreadToParticipants(conversation);

        this._emitReadReceipt(conversationId, userId, readAt);

        const enriched = await ChatRepository.enrichConversations([conversation], userId);
        return { success: true, conversation: enriched[0], ...data };
    }

    async _notifyRecipients(conversationId, sender, preview) {
        for (const participant of this._otherParticipants(
            await ChatRepository.findConversationById(conversationId),
            sender._id
        )) {
            await ChatRepository.unhideConversationForUser(conversationId, participant.userId);
            const updated = await ChatRepository.findConversationById(conversationId);
            if (ChatRepository.isMuted(updated, participant.userId)) continue;

            await NotificationService.createForUser({
                recipientId: participant.userId,
                sender,
                title: `Message from ${sender.name}`,
                message: preview,
                type: 'system',
                metadata: { conversationId: String(conversationId), kind: 'chat' },
            });
        }
    }

    async sendMessage({
        conversationId,
        user,
        content = '',
        type = 'text',
        attachments = [],
        replyTo = null,
        forwardedFrom = null,
    }) {
        const conversation = await ChatRepository.findConversationById(conversationId);
        if (!conversation || !this._isParticipant(conversation, user._id)) {
            return { success: false, message: 'Conversation not found' };
        }

        const trimmed = String(content || '').trim();
        if (!trimmed && !attachments.length) {
            return { success: false, message: 'Message cannot be empty' };
        }

        const messageType =
            type ||
            (attachments[0]?.mimeType?.startsWith('image/')
                ? 'image'
                : attachments[0]?.mimeType?.startsWith('video/')
                  ? 'video'
                  : attachments.length
                    ? 'file'
                    : 'text');

        const message = await ChatRepository.createMessage({
            conversationId,
            senderId: user._id,
            senderName: user.name,
            type: messageType,
            content: trimmed,
            attachments,
            replyTo: replyTo || null,
            forwardedFrom: forwardedFrom || null,
            readBy: [{ userId: user._id, readAt: new Date() }],
        });

        const msgObj = message.toObject();
        const preview = this._messagePreview(messageType, trimmed);

        const updatedConversation = await ChatRepository.updateConversationLastMessage(conversationId, {
            text: preview,
            senderId: user._id,
            type: messageType,
            createdAt: msgObj.createdAt,
        });

        const freshConv = await ChatRepository.findConversationById(conversationId);
        await this._notifyRecipients(conversationId, user, preview);

        const enriched = await ChatRepository.enrichConversations([updatedConversation], user._id);
        await this._emitNewMessage(conversationId, msgObj);
        await this._emitUnreadToParticipants(freshConv);

        return { success: true, message: msgObj, conversation: enriched[0] };
    }

    async forwardMessage(messageId, user, targetConversationId) {
        const original = await ChatRepository.findMessageById(messageId);
        if (!original || original.isDeleted) {
            return { success: false, message: 'Message not found' };
        }

        const sourceConv = await ChatRepository.findConversationById(original.conversationId);
        if (!this._isParticipant(sourceConv, user._id)) {
            return { success: false, message: 'Conversation not found' };
        }

        return this.sendMessage({
            conversationId: targetConversationId,
            user,
            content: original.content,
            type: original.type,
            attachments: original.attachments || [],
            forwardedFrom: {
                messageId: original._id,
                senderName: original.senderName,
                conversationId: original.conversationId,
            },
        });
    }

    async editMessage(messageId, user, content) {
        const message = await ChatRepository.findMessageById(messageId);
        if (!message || message.isDeleted) return { success: false, message: 'Message not found' };
        if (String(message.senderId) !== String(user._id)) {
            return { success: false, message: 'You can only edit your own messages' };
        }

        const trimmed = String(content || '').trim();
        if (!trimmed) return { success: false, message: 'Message cannot be empty' };

        const updated = await ChatRepository.updateMessage(messageId, {
            content: trimmed,
            isEdited: true,
            editedAt: new Date(),
        });

        const conversation = await ChatRepository.findConversationById(message.conversationId);
        this._emitConversation(conversation, 'chat:message-updated', { message: updated });
        return { success: true, message: updated };
    }

    async deleteMessage(messageId, user) {
        const message = await ChatRepository.findMessageById(messageId);
        if (!message || message.isDeleted) return { success: false, message: 'Message not found' };
        if (String(message.senderId) !== String(user._id)) {
            return { success: false, message: 'You can only delete your own messages' };
        }

        const updated = await ChatRepository.updateMessage(messageId, {
            isDeleted: true,
            deletedAt: new Date(),
            content: '',
            attachments: [],
        });

        const conversation = await ChatRepository.findConversationById(message.conversationId);
        if (conversation?.pinnedMessageId && String(conversation.pinnedMessageId) === String(messageId)) {
            await ChatRepository.clearPinnedMessage(message.conversationId);
        }

        this._emitConversation(conversation, 'chat:message-deleted', {
            messageId,
            conversationId: message.conversationId,
        });
        return { success: true, message: updated };
    }

    async pinMessage(messageId, user, pin = true) {
        const message = await ChatRepository.findMessageById(messageId);
        if (!message || message.isDeleted) return { success: false, message: 'Message not found' };

        const conversation = await ChatRepository.findConversationById(message.conversationId);
        if (!this._isParticipant(conversation, user._id)) {
            return { success: false, message: 'Conversation not found' };
        }

        await ChatRepository.unpinAllInConversation(message.conversationId);

        let updated;
        let updatedConversation;
        if (pin) {
            updated = await ChatRepository.updateMessage(messageId, { isPinned: true, pinnedAt: new Date() });
            updatedConversation = await ChatRepository.setPinnedMessage(message.conversationId, messageId);
        } else {
            updated = await ChatRepository.updateMessage(messageId, { isPinned: false, pinnedAt: null });
            updatedConversation = await ChatRepository.clearPinnedMessage(message.conversationId);
        }

        this._emitConversation(conversation, 'chat:message-updated', {
            message: updated,
            conversation: updatedConversation,
        });
        return { success: true, message: updated, conversation: updatedConversation };
    }

    async muteConversation(conversationId, user, mute = true) {
        const conversation = await ChatRepository.findConversationById(conversationId);
        if (!this._isParticipant(conversation, user._id)) {
            return { success: false, message: 'Conversation not found' };
        }

        const updated = await ChatRepository.setConversationMuted(conversationId, user._id, mute);
        const enriched = await ChatRepository.enrichConversations([updated], user._id);
        this._emitConversation(updated, 'chat:conversation-updated', { conversation: enriched[0] });
        return { success: true, conversation: enriched[0] };
    }

    async deleteConversation(conversationId, user) {
        const conversation = await ChatRepository.findConversationById(conversationId);
        if (!this._isParticipant(conversation, user._id)) {
            return { success: false, message: 'Conversation not found' };
        }

        await ChatRepository.setConversationHidden(conversationId, user._id, true);
        emitToUser(String(user._id), 'chat:conversation-deleted', { conversationId });
        const summary = await ChatRepository.getUnreadSummary(user._id);
        emitToUser(String(user._id), 'chat:unread', summary);
        return { success: true };
    }

    async _emitReadReceipt(conversationId, readerId, readAt) {
        const conversation = await ChatRepository.findConversationById(conversationId);
        if (!conversation) return;

        const iso = readAt.toISOString();
        const convId = String(conversationId);

        for (const id of conversation.participantIds) {
            const [enriched] = await ChatRepository.enrichConversations([conversation], id);
            emitToUser(String(id), 'chat:read', {
                conversationId: convId,
                userId: String(readerId),
                readAt: iso,
            });
            emitToUser(String(id), 'chat:conversation-updated', { conversation: enriched });
        }
    }

    async markRead(conversationId, userId) {
        const conversation = await ChatRepository.findConversationById(conversationId);
        if (!this._isParticipant(conversation, userId)) return { success: false };

        const readAt = await ChatRepository.markMessagesRead(conversationId, userId);
        this._emitReadReceipt(conversationId, userId, readAt);
        await this._emitUnreadToParticipants(conversation);
        return { success: true, readAt };
    }
}

module.exports = new ChatService();
