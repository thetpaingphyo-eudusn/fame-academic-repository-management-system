const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true, index: true },
        provider: {
            type: String,
            enum: ['gemini', 'openai', 'openrouter'],
            default: 'gemini',
        },
        chatModel: { type: String, default: 'gemini-2.5-flash' },
        embedModel: { type: String, default: 'gemini-embedding-2' },
        chatEnabled: { type: Boolean, default: true },
        embeddingEnabled: { type: Boolean, default: false },
        localFallbackEnabled: { type: Boolean, default: true },
        codingAssistantEnabled: { type: Boolean, default: true },
        codingAssistantEngine: {
            type: String,
            enum: ['standard', 'cursor'],
            default: 'standard',
        },
        cursorModel: { type: String, default: 'composer-2.5' },
        codingModel: { type: String, default: '' },
        cursorApiKeyEncrypted: { type: String, default: '' },
        apiKeyEncrypted: { type: String, default: '' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);
