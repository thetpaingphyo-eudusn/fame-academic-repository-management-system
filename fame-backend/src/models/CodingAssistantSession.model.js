const mongoose = require('mongoose');

const CodingFileSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        content: { type: String, default: '' },
    },
    { _id: false }
);

const CodingIssueSchema = new mongoose.Schema(
    {
        type: { type: String, enum: ['error', 'warning', 'tip'], default: 'tip' },
        title: { type: String, default: '' },
        detail: { type: String, default: '' },
    },
    { _id: false }
);

const CodingAssistantSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        userRole: {
            type: String,
            enum: ['admin', 'teacher', 'student'],
            required: true,
        },
        title: { type: String, default: 'Untitled session', trim: true },
        mode: {
            type: String,
            enum: ['generate', 'debug', 'fix', 'explain'],
            default: 'generate',
        },
        prompt: { type: String, default: '' },
        language: { type: String, default: 'html' },
        files: { type: [CodingFileSchema], default: [] },
        previewHtml: { type: String, default: '' },
        previewMeta: {
            html: { type: String, default: '' },
            css: { type: String, default: '' },
            javascript: { type: String, default: '' },
        },
        explanation: { type: String, default: '' },
        issues: { type: [CodingIssueSchema], default: [] },
        source: { type: String, default: 'gemini' },
    },
    { timestamps: true }
);

CodingAssistantSessionSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('CodingAssistantSession', CodingAssistantSessionSchema);
