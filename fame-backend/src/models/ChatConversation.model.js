const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        userName: { type: String, default: 'User' },
        userRole: { type: String, enum: ['admin', 'teacher', 'student'] },
        userEmail: { type: String, default: '' },
    },
    { _id: false }
);

const UserSettingSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        isMuted: { type: Boolean, default: false },
        isHidden: { type: Boolean, default: false },
        hiddenAt: { type: Date, default: null },
    },
    { _id: false }
);

const ChatConversationSchema = new mongoose.Schema(
    {
        type: { type: String, enum: ['direct'], default: 'direct' },
        participants: {
            type: [ParticipantSchema],
            validate: [(v) => v.length >= 2, 'Conversation needs at least 2 participants'],
        },
        participantIds: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
            index: true,
        },
        lastMessage: {
            text: { type: String, default: '' },
            senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            type: { type: String, default: 'text' },
            createdAt: { type: Date },
        },
        lastMessageAt: { type: Date, default: Date.now, index: true },
        pinnedMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage', default: null },
        userSettings: { type: [UserSettingSchema], default: [] },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

ChatConversationSchema.index({ participantIds: 1, lastMessageAt: -1 });

module.exports = mongoose.model('ChatConversation', ChatConversationSchema);
