const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema(
    {
        url: { type: String, required: true },
        fileName: { type: String, default: 'file' },
        mimeType: { type: String, default: 'application/octet-stream' },
        size: { type: Number, default: 0 },
    },
    { _id: false }
);

const ReadReceiptSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        readAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const ReplyToSchema = new mongoose.Schema(
    {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
        senderName: { type: String, default: '' },
        content: { type: String, default: '' },
        type: { type: String, default: 'text' },
    },
    { _id: false }
);

const ForwardedFromSchema = new mongoose.Schema(
    {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
        senderName: { type: String, default: '' },
        conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatConversation' },
    },
    { _id: false }
);

const ChatMessageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatConversation',
            required: true,
            index: true,
        },
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        senderName: { type: String, default: 'User' },
        type: {
            type: String,
            enum: ['text', 'image', 'video', 'file'],
            default: 'text',
        },
        content: { type: String, default: '', maxlength: 5000 },
        attachments: { type: [AttachmentSchema], default: [] },
        replyTo: { type: ReplyToSchema, default: null },
        forwardedFrom: { type: ForwardedFromSchema, default: null },
        isEdited: { type: Boolean, default: false },
        editedAt: { type: Date, default: null },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
        isPinned: { type: Boolean, default: false },
        pinnedAt: { type: Date, default: null },
        readBy: { type: [ReadReceiptSchema], default: [] },
    },
    { timestamps: true }
);

ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
