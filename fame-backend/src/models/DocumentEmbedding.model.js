const mongoose = require('mongoose');

const DocumentEmbeddingSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: false,
        default: null
    },
    versionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectVersion',
        required: false,  // ✅ Changed to false - not required for training
        default: null
    },
    documentType: {
        type: String,
        enum: ['srs', 'design', 'manual', 'code_summary', 'project_full', 'student_profile', 'course_summary', 'site_summary'],
        required: true
    },
    // Chunk information (for large documents)
    chunkIndex: {
        type: Number,
        default: 0
    },
    totalChunks: {
        type: Number,
        default: 1
    },
    // Original text chunk (up to 1000 chars for context)
    originalText: {
        type: String,
        required: true
    },
    // Gemini embedding vector (3072 dimensions for gemini-embedding-2)
    embeddingVector: {
        type: [Number],
        required: true
    },
    // Metadata
    embeddingModel: {
        type: String,
        default: 'gemini-embedding-2'
    },
    textLength: {
        type: Number,
        default: 0
    },
    language: {
        type: String,
        enum: ['en', 'my', 'both'],
        default: 'en'
    },
    // Processing status
    isProcessed: {
        type: Boolean,
        default: true
    },
    processedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for fast vector search
DocumentEmbeddingSchema.index({ projectId: 1, versionId: 1 });
DocumentEmbeddingSchema.index({ documentType: 1 });
DocumentEmbeddingSchema.index({ chunkIndex: 1 });

module.exports = mongoose.model('DocumentEmbedding', DocumentEmbeddingSchema);