const mongoose = require('mongoose');

const RagChatMessageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        source: {
            type: String,
            default: null,
        },
        links: {
            type: [mongoose.Schema.Types.Mixed],
            default: [],
        },
        charts: {
            type: [mongoose.Schema.Types.Mixed],
            default: [],
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

const RagChatSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        userName: {
            type: String,
            default: 'Unknown',
        },
        userEmail: {
            type: String,
            default: '',
        },
        userRole: {
            type: String,
            enum: ['admin', 'teacher', 'student'],
            required: true,
            index: true,
        },
        title: {
            type: String,
            default: 'New chat',
            trim: true,
        },
        messages: {
            type: [RagChatMessageSchema],
            default: [],
        },
        messageCount: {
            type: Number,
            default: 0,
        },
        lastMessageAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

RagChatSessionSchema.index({ userRole: 1, lastMessageAt: -1 });
RagChatSessionSchema.index({ userName: 'text', title: 'text', userEmail: 'text' });

module.exports = mongoose.model('RagChatSession', RagChatSessionSchema);
